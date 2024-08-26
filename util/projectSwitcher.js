/**
Wechsel
Copyright (C) 2024 JustSomeRandomUsername

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.

SPDX-License_identifier: GPL-3.0-or-later
*/

import * as SwitcherPopup from 'resource:///org/gnome/shell/ui/switcherPopup.js';

import St from 'gi://St';
import GObject from 'gi://GObject';
import Clutter from 'gi://Clutter';

const ProjectSwitcher = GObject.registerClass(
class InputSourceSwitcher extends SwitcherPopup.SwitcherList {
    constructor(items, has_parent) {
        super(true);

        this._arrow_up = new St.DrawingArea({ style_class: 'switcher-arrow' });
        this._arrow_up.connect('repaint', () => SwitcherPopup.drawArrow(this._arrow_up, St.Side.TOP));
        this.add_child(this._arrow_up);
        if (!has_parent) 
            this._arrow_up.hide();

        this._arrows = [];
        for (let i = 0; i < items.length; i++)
            this._addIcon(items[i], i === 0);
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
        this.add_child(arrow);
        
        // Arr is hidden if there are no children
        if (item.children.length === 0 || root) {
            arrow.hide();
        }

        this.addItem(box, text);
    }

    vfunc_allocate(box) {
        // Allocate the main list items
        super.vfunc_allocate(box);

        let contentBox = this.get_theme_node().get_content_box(box);

        let arrowHeight = Math.floor(this.get_theme_node().get_padding(St.Side.BOTTOM) / 3);
        let arrowWidth = arrowHeight * 2;
        
        // Get the current scroll position
        let [value] = this._scrollView.hscroll.adjustment.get_values();//TODO deprecated

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

const ProjectSwitcherPopup = GObject.registerClass(
class InputSourcePopup extends SwitcherPopup.SwitcherPopup {
    constructor(action, actionBackward, indicator, binding, root_prj, active = "", selections = []) {
        
        const a = ProjectSwitcherPopup.searchForActivePrj(root_prj, active, selections);
        if (a === null) {
            throw new Error("Selected a project that could not be found in the project tree, this should not happen");
        }    
        const [parent, newSelections] = a;
        
        super([parent, ...parent.children]);
        
        this.active = active;
        this._action = action;
        this._actionBackward = actionBackward;
        this._indicator = indicator;
        this._selections = newSelections;
        this.binding = binding;
        this.root_prj = root_prj;


        this._switcherList = new ProjectSwitcher(this._items, this._selections.length !== 1);
    }

    static searchForActivePrj(parent, active, selections) {
        if (active === "") {
            if (selections.length === 2) {
                return [parent.children[selections[0]], selections]
            } else if (selections.length === 1) {
                // selected root_project
                return [parent, selections]
            } else if (selections.length === 0) {
                return [parent, [0]];
            }
            // was opened by another Popup so we don't have to search through the full tree
            const idx = selections.shift();
            let [a,b] = ProjectSwitcherPopup.searchForActivePrj(parent.children[idx], active, selections);
            return [a, [idx, ...b]];
        }
        for (const [idx, child] of parent.children.entries()) {
            if (child.name === active) {
                return [parent, [...selections, idx]];
            }
            if (child.children.length > 0) {
                const ret = ProjectSwitcherPopup.searchForActivePrj(child, active, [...selections, idx]);
                if (ret !== null) {
                    return ret;
                }
            }
        }
        if (parent.name === active) {
            return [parent, [0]] // this should only happen if root is selected
        }
        return null
    }


    findIdx(items, backward) {
        for (const [idx, item] of items.entries()) {
            if (item.name === this.active) {
                const i = ((idx - 1 + (backward ? -1 : 1)) % (items.length-1));// the minus one plus one is to adjust circle only around the child items and ignore the parent entry
                // Wrap around if at the edge
                if (i >= 0) {
                    return i+1;
                } else {
                    return items.length + i;
                }
            }
        }
        return -1;
    }

    _initialSelection(backward, _binding) {
        if (this.active === "") {
            //Opened by another projectSwitcher
            this._select(Math.min(this._items.length, this._selections[this._selections.length -1]+1))//plus one because of the parent
            return
        } else {
            // Initial Opening
            let idx = this.findIdx(this._items, backward);
            if (idx !== -1) {
                this._select(idx);
                return
            }
        }
        if (this._items.length > 0) {
            this._select(0);
        }
    }

    showChildPopup() {
        this._switcherPopup.connect('destroy', () => {
            this._switcherPopup = null;
        });    
        if (!this._switcherPopup.show(this.binding.is_reversed(), this.binding.get_name(), this.binding.get_mask()))
            this._switcherPopup.fadeAndDestroy();
    }

    _keyPressHandler(keysym, action) {
        if (action === this._action)
            this._select(this._next());
        else if (action === this._actionBackward)
            this._select(this._previous());
        else if (keysym === Clutter.KEY_Left)
            this._select(this._previous());
        else if (keysym === Clutter.KEY_Right)
            this._select(this._next());

        else if (keysym === Clutter.KEY_Up) {
            if (this._selections.length === 1)// parent is root
                return Clutter.EVENT_STOP;

            this.nav_up();

        } else if (keysym === Clutter.KEY_Down) {
            let parent = this._items[this._selectedIndex]

            if (parent.children.length === 0 || this._selectedIndex === 0)
                return Clutter.EVENT_STOP;
            
            this.nav_down();
        }
        else
            return Clutter.EVENT_PROPAGATE;

        return Clutter.EVENT_STOP;
    }

    nav_up() {
        this._selections.pop();
        this.spawn_child_popup();
    }

    nav_down() {
        this._selections.pop();
        this._selections.push(this._selectedIndex - 1);//minus 1 to because at index 0 we inserted the parent
        this._selections.push(0);//select first item

        this.spawn_child_popup();    
    }

    
    spawn_child_popup() {
        this.destroy();

        this._switcherPopup = new ProjectSwitcherPopup(this._action, this._actionBackward, this._indicator, this.binding, this.root_prj, "", this._selections);
        this.showChildPopup();
    }



    // This is called when a user clickes outside
    vfunc_button_press_event() {
        if (this._selections.length === 1)  {// parent is root
            super.vfunc_button_press_event();
            return;
        }
        
        this.nav_up();
    }


    // This is called when an item is clicked with the mosue
    _itemActivated(switcher, n) {
        super._itemActivated(switcher, n);
        let parent = this._items[this._selectedIndex]

        if (parent.children.length === 0 || this._selectedIndex === 0) {
            super._itemActivated(switcher, n);
            return;
        }

        this.nav_down();
    }

    _finish() {
        super._finish();

        let new_prj = this._items[this._selectedIndex].name;
        this._indicator.change_project(new_prj);
        this._indicator.updateUI();
    }
});
    
export { ProjectSwitcherPopup, ProjectSwitcher }