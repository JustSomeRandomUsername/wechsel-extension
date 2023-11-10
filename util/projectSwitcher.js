import * as SwitcherPopup from 'resource:///org/gnome/shell/ui/switcherPopup.js';

import St from 'gi://St';
import GObject from 'gi://GObject';
import Clutter from 'gi://Clutter';
// import Atk from 'gi://Atk';

const ProjectSwitcherPopup = GObject.registerClass(
    class InputSourcePopup extends SwitcherPopup.SwitcherPopup {
        _init(items, action, actionBackward, indicator, binding, parents, active) {
            super._init(items);
            
            this.active = active;
            this._action = action;
            this._actionBackward = actionBackward;
            this._indicator = indicator;
            this._selections = [0];
            this.binding = binding;
            this.parents = parents;

            this._switcherList = new ProjectSwitcher(this._items, parents.length != 0);
        }

        _initialSelection(backward, binding) {
            for (const i of this._items) {
                if (i.name == this.active) {
                    this._select(Math.max(0, Math.min(this._items.indexOf(i) + (backward ? -1 : 1), this._items.length - 1)));
                    return;
                }
            }
            if (this._items.length > 0) {
                this._select(0);
            }
        }
    
        _keyPressHandler(keysym, action) {
            if (action == this._action)
                this._select(this._next());
            else if (action == this._actionBackward)
                this._select(this._previous());
            else if (keysym == Clutter.KEY_Left)
                this._select(this._previous());
            else if (keysym == Clutter.KEY_Right)
                this._select(this._next());

            else if (keysym == Clutter.KEY_Up) {
                if (this.parents[this.parents.length-1].length == 0) 
                    return Clutter.EVENT_STOP;

                this.destroy();
                let new_items = this.parents.pop();
                this._selections.pop();

                _switcherPopup = new ProjectSwitcherPopup(new_items, this._action, this._actionBackward/* Backwards*/, this._indicator, this.binding, this.parents, this.active);
                _switcherPopup.connect('destroy', () => {
                    _switcherPopup = null;
                });
                if (!_switcherPopup.show(this.binding.is_reversed(), this.binding.get_name(), this.binding.get_mask()))
                    _switcherPopup.fadeAndDestroy();

            } else if (keysym == Clutter.KEY_Down) {
                let children = this._items[this._selectedIndex].children;
              
                if (children.length == 0) 
                    return Clutter.EVENT_STOP;

                let parents = this.parents;
                parents.push(this._items);
                this._selections.pop();
                this._selections.push(this._selectedIndex);
                this._selections.push(0);

                this.destroy();

                _switcherPopup = new ProjectSwitcherPopup(children, this._action, this._actionBackward/* Backwards*/, this._indicator, this.binding, parents);
                _switcherPopup.connect('destroy', () => {
                    _switcherPopup = null;
                });
                if (!_switcherPopup.show(this.binding.is_reversed(), this.binding.get_name(), this.binding.get_mask()))
                    _switcherPopup.fadeAndDestroy();
            }
            else
                return Clutter.EVENT_PROPAGATE;
    
            return Clutter.EVENT_STOP;
        }
    
        _finish() {
            super._finish();

            let new_prj = this._items[this._selectedIndex].name;
            this._indicator.change_project(new_prj);
            this._indicator.updateUI();
        }
    });
    
const ProjectSwitcher = GObject.registerClass(
    class InputSourceSwitcher extends SwitcherPopup.SwitcherList {
        _init(items, has_parent) {
            super._init(true);
    
            this._arrow_up = new St.DrawingArea({ style_class: 'switcher-arrow' });
            this._arrow_up.connect('repaint', () => SwitcherPopup.drawArrow(this._arrow_up, St.Side.TOP));
            this.add_actor(this._arrow_up);
            if (!has_parent) 
                this._arrow_up.hide();

            this._arrows = [];
            for (let i = 0; i < items.length; i++)
                this._addIcon(items[i], i == 0);
        }
    
        _addIcon(item, root) {
            let box = new St.BoxLayout({ vertical: true });
    
            let bin = new St.Bin({ style_class: 'input-source-switcher-symbol' });
            let symbol = new St.Label({
                text: item.name.substring(0, 3),
                x_align: Clutter.ActorAlign.CENTER,
                y_align: Clutter.ActorAlign.CENTER,
            });
            bin.set_child(symbol);
            box.add_child(bin);
    
            let text = new St.Label({
                text: item.name,
                x_align: Clutter.ActorAlign.CENTER,
            });
            box.add_child(text);
    
            // Add the arrow
            let arrow = new St.DrawingArea({ style_class: 'switcher-arrow' });
            arrow.connect('repaint', () => SwitcherPopup.drawArrow(arrow, St.Side.BOTTOM));
            this._arrows.push(arrow);
            this.add_actor(arrow);
            
            // Arr is hidden if there are no children
            if (item.children.length == 0 || root) {
                arrow.hide();
            }

            let ui_item = this.addItem(box, text);
            // ui_item.add_accessible_state(Atk.StateType.EXPANDABLE);

        }

        vfunc_allocate(box) {
            // Allocate the main list items
            super.vfunc_allocate(box);
    
            let contentBox = this.get_theme_node().get_content_box(box);
    
            let arrowHeight = Math.floor(this.get_theme_node().get_padding(St.Side.BOTTOM) / 3);
            let arrowWidth = arrowHeight * 2;
            
            // Get the current scroll position
            let [value] = this._scrollView.hscroll.adjustment.get_values();

            // Now allocate each arrow underneath its item
            let childBox = new Clutter.ActorBox();
            for (let i = 0; i < this._items.length; i++) {
                let itemBox = this._items[i].allocation;
                childBox.x1 = -value + contentBox.x1 + Math.floor(itemBox.x1 + (itemBox.x2 - itemBox.x1 - arrowWidth) / 2);
                childBox.x2 = childBox.x1 + arrowWidth;
                childBox.y1 = contentBox.y1 + itemBox.y2 + arrowHeight;
                childBox.y2 = childBox.y1 + arrowHeight;
                this._arrows[i].allocate(childBox);
            }

            // Allocate the top arrow
            childBox.x1 = contentBox.x1 + Math.floor((contentBox.x2 - contentBox.x1 - arrowWidth) / 2);
            childBox.x2 = childBox.x1 + arrowWidth;
           
            childBox.y1 = contentBox.y1;
            childBox.y2 = childBox.y1 + arrowHeight;
            this._arrow_up.allocate(childBox);

        }
    
    });
    
export { ProjectSwitcherPopup, ProjectSwitcher }