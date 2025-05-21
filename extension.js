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

import St from 'gi://St';
import Atk from 'gi://Atk';
import GObject from 'gi://GObject';
import Gio from 'gi://Gio';
import Meta from 'gi://Meta';
import Shell from 'gi://Shell';
import Clutter from 'gi://Clutter';

import { wm, panel } from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

import { callChangeProject, checkInstallation, getIcons, getProjectTree } from './util/utils.js';

import { SearchProvider } from './searchProvider.js';
import { ProjectSwitcherPopup } from './util/projectSwitcher.js'

import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import { registerProvider, unregisterProvider } from './util/searchProviderRegistration.js';

const interfaceXml = `
    <node>
        <interface name="org.gnome.shell.extensions.wechsel.service">
            <method name="Reload"/>
        </interface>
    </node>
`;

const FoldoutLeaf = GObject.registerClass(
    {
        Properties: {
            'active-project': GObject.ParamSpec.string(
                'active-project',
                'Active Project',
                'The currently active Project',
                GObject.ParamFlags.READWRITE,
                null
            ),
        },
    },
    class FoldoutLeaf extends PopupMenu.PopupMenuItem {
        constructor(
            name,
            indicator
        ) {
            super(name);

            this.connect('notify::active-project', (object, _pspec) => {
                if (object.active_project === name) {
                    this.label.add_style_class_name('active-project');
                } else {
                    this.label.remove_style_class_name('active-project');
                }
            });

            this.label.add_style_class_name('leaf-label');
            this.add_style_class_name('leaf');

            this.connect('activate', () => {
                indicator.change_project(name);
            });
        }
    });

const FoldoutChildren = GObject.registerClass(
    class FoldoutChildren extends St.BoxLayout {
        constructor() {
            super({
                orientation: Clutter.Orientation.VERTICAL,
                x_expand: true,
                y_expand: true,
            });
            this.add_style_class_name('foldout-children');
        }
    });

const Foldout = GObject.registerClass(
    {
        Properties: {
            'active-project': GObject.ParamSpec.string(
                'active-project',
                'Active Project',
                'The currently active Project',
                GObject.ParamFlags.READWRITE,
                null
            ),
        },
    },
    class Foldout extends PopupMenu.PopupBaseMenuItem {
        constructor(
            name,
            is_root = false,
            indicator = undefined,
            depth = 0
        ) {
            super({
                activate: true,
                hover: true,
                can_focus: true,
                style_class: 'popup-menu-item',
            });

            this.ignore_next_hover = false;
            this.is_root = is_root;
            this.indicator = indicator;
            this.project_name = name;
            this.depth = depth;
            this.unfolded = false;
            this.children = [];

            this.box = new St.BoxLayout({
                orientation: Clutter.Orientation.VERTICAL,
                x_expand: true,
                y_expand: true
            });

            this.header_box = new St.BoxLayout({
                orientation: Clutter.Orientation.HORIZONTAL,
                x_expand: true,
                y_expand: true,
            });


            this._icon = new St.Button({
                style_class: 'popup-menu-icon',
                can_focus: false,
                child: new St.Icon({
                    icon_name: 'pan-end-symbolic',
                    icon_size: 16,
                }),
            });
            this._icon.connect('clicked', () => {
                if (this.unfolded) {
                    this.close();
                } else {
                    this.open();
                }
            });
            this._label = new St.Label({
                text: name,
                y_align: Clutter.ActorAlign.CENTER,
            })
            this._label.add_style_class_name('submenu-label');

            this.connect('notify::active-project', (object, _pspec) => {
                if (object.active_project === name) {
                    this._label.add_style_class_name('active-project');
                    if (!this.unfolded) {
                        this.open();
                    }
                } else {
                    this._label.remove_style_class_name('active-project');
                }
            });


            this._ornament = new St.Icon({
                icon_name: 'ornament-check-symbolic',
                icon_size: 16,
                style_class: 'popup-menu-icon',
            });


            this.header_box.add_child(this._icon);
            this.header_box.add_child(this._label);
            this.header_box.add_child(this._ornament);

            this.hideOrnament();

            this.child_container = new FoldoutChildren(this);

            this.box.add_child(this.header_box);
            this.box.add_child(this.child_container);

            this.add_accessible_state(Atk.StateType.EXPANDABLE);
            this.add_child(this.box);

            this.set_track_hover(false);

            if (this.is_root) {
                this.connect('enter-event', () => {
                    if (this.ignore_next_hover) {
                        this.ignore_next_hover = false;
                    } else {
                        this.indicator.emit('hover_changed');
                        this.set_hover(true);
                    }
                });
            }

            // Close this submenu when another submenu is opened
            this.close_submenus_connection = this.indicator.connect('close_submenus', (a, close_depth, prj_name) => {
                if (close_depth === this.depth && this.unfolded === true && prj_name !== this.project_name) {
                    this.close();
                }
            });

            // Set hover to false when another submenu is hovered
            this.hover_changed_connection = this.indicator.connect('hover_changed', () => {
                if (this.hover) {
                    this.set_hover(false);
                }
            });

            this.close()
        }

        activate(_event) {
            if (this.unfolded) {
                if (this.indicator) {
                    this.indicator.change_project(this.project_name);
                } else {
                    //This should not happen
                    this.close();
                }
            } else {
                this.indicator.change_project(this.project_name, false);
                this.open();
            }
        }

        addMenuItem(item) {
            this.child_container.add_child(item);
            this.children.push(item);

            // disable hover when the child container is hovered and this item is hovered
            if (item.connect) {
                // disable hover when the child container is hovered and this item is hovered
                item.connect('enter-event', () => {
                    if (this.hover) {
                        this.set_hover(false);
                        this.ignore_next_hover = true;
                    }
                    if (item.ignore_next_hover !== undefined && item.ignore_next_hover) {
                        item.ignore_next_hover = false;

                    } else {
                        this.indicator.emit('hover_changed');
                        item.set_hover(true);
                    }
                });

                // close menu when left arrow key is pressed on child
                item.connect('key-press-event', (_actor, event) => {
                    let symbol = event.get_key_symbol();
                    if (symbol === Clutter.KEY_Left && !item.unfolded && !this.is_root) {
                        this.close();
                        // focus this
                        this.grab_key_focus();
                        return Clutter.EVENT_STOP;
                    }
                    // handle up down focus
                    if (symbol === Clutter.KEY_Up) {
                        let prev = item.get_previous_sibling();
                        if (prev) {
                            prev.grab_key_focus();
                        } else {
                            this.grab_key_focus();
                        }
                        return Clutter.EVENT_STOP;
                    }
                    if (symbol === Clutter.KEY_Down) {
                        let next = item.get_next_sibling();
                        if (next) {
                            next.grab_key_focus();
                        } else {
                            this.get_next_sibling().grab_key_focus();
                        }
                        return Clutter.EVENT_STOP;
                    }
                    return Clutter.EVENT_PROPAGATE;
                });
            }
        }

        open(emit_close_signal = true) {
            if (emit_close_signal) {
                this.indicator.emit('close_submenus', this.depth, this.project_name);
            }
            this.unfolded = true;
            this._icon.icon_name = 'pan-down-symbolic';
            this.box.add_style_class_name('open');
            this.add_style_class_name('open');
            this.child_container.show();
        }

        close() {
            this.unfolded = false;
            this._icon.icon_name = 'pan-end-symbolic';
            this.box.remove_style_class_name('open');
            this.remove_style_class_name('open');

            this.child_container.hide();
        }

        vfunc_key_press_event(event) {
            let symbol = event.get_key_symbol();

            if (symbol === Clutter.KEY_Right && (!this.unfolded || this.has_key_focus())) {
                this.open();
                // focus the first child in the child_container
                this.child_container.get_first_child().grab_key_focus();
                return Clutter.EVENT_STOP;
            } else if (symbol === Clutter.KEY_Left && this.unfolded && !this.is_root) {
                this.close();
                // focus this
                this.grab_key_focus();
                return Clutter.EVENT_STOP;
            } else if (symbol === Clutter.KEY_Down && this.has_key_focus()) {
                this.child_container.get_first_child().grab_key_focus();
                return Clutter.EVENT_STOP;
            }

            return super.vfunc_key_press_event(event);
        }

        showOrnament() {
            this._ornament.show();
        }

        hideOrnament() {
            this._ornament.hide();
        }

        destroy() {
            for (let child of this.children) {
                child.destroy();
            }
            if (this.hover_changed_connection) {
                this.indicator.disconnect(this.hover_changed_connection);
                this.hover_changed_connection = null;
            }
            if (this.close_submenus_connection) {
                this.indicator.disconnect(this.close_submenus_connection);
                this.close_submenus_connection = null;
            }
            this.box?.destroy();
            this.box = null;
            super.destroy();
        }
    });

const Indicator = GObject.registerClass(
    {
        Signals: {
            'close_submenus': {
                param_types: [GObject.TYPE_INT, GObject.TYPE_STRING],
            },
            'hover_changed': {},
        },
        Properties: {
            'active-project': GObject.ParamSpec.string(
                'active-project',
                'Active Project',
                'The currently active Project',
                GObject.ParamFlags.READWRITE,
                null
            ),
        },
    },
    class Indicator extends PanelMenu.Button {

        _init(extension) {
            super._init(0.0, 'Project Indicator');

            /**
             * The PopupMenu reference of the indicator
             * @type {import('resource:///org/gnome/shell/ui/popupMenu.js').PopupMenu} */
            this.menu;

            /** 
             * reference to the extension object
             * @type {WechselExtension} */
            this.extension = extension;

            /**
             * Is the wechsel tool installed
             * @type {boolean}
             */
            this.installed = checkInstallation(this._proc)

            /**
             * tracks the state of the menu
             * @type {boolean} */
            this.menu_open = false;

            /**
             * name of the active project
             * @type {string} */
            this.active_project = ""
            if (this.installed !== true) {
                this.active_project = '--Error--'
            }

            /** 
             * Text label inside the button indicator
             * @type {St.Label}
             */
            this.panelIcon = new St.Label({
                text: "",
                y_align: Clutter.ActorAlign.CENTER,
            })
            this.add_child(this.panelIcon);


            this.menu.connect('open-state-changed', (
                _menu,
            /** updated open state @type {boolean} */ open
            ) => {
                // PanelMenu.Button automatically opens and closes its PopupMenu

                this.menu_open = open;
                if (open) {
                    if (this.installed !== true) {
                        this.installed = checkInstallation(this._proc)

                        if (this.installed !== true) {
                            return
                        }
                    }
                    // refresh the popupmenu
                    this.updateUI(true);
                }
            });

            /**
             * section for all projects. this will be rerendered dynamically
             * @type {PopupMenu.PopupMenuSection} */
            this.item_projects_section = new PopupMenu.PopupMenuSection();
            this.menu.addMenuItem(this.item_projects_section);

            // separator between the projects and the settings
            this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

            /**
             * reference to the Settings item in the menu
             * @type {PopupMenu.PopupMenuItem} */
            this.item_settings = new PopupMenu.PopupMenuItem('Settings');
            // open preferences page when settings is activated
            this.item_settings.connect('activate', () => {
                this.extension.openPreferences();
            });
            this.item_settings.connect('enter-event', () => {
                this.emit('hover_changed');
            });
            this.menu.addMenuItem(this.item_settings);

            // binds the active project name to the indicator button text
            this.bind_property('active-project', this.panelIcon, 'text',
                GObject.BindingFlags.SYNC_CREATE | GObject.BindingFlags.DEFAULT);


            // initial update
            this.updateUI();
        }

        updateUI(open = false) {
            if (this.installed !== true) {
                return
            }

            /**
             * Inserts all children of a project into the menu
             * 
             * @param {import('./util/utils.js').ProjectTree} project
             * @param {PopupMenu.PopupMenuSection | PopupMenu.PopupSubMenuMenuItem} menu parent object to insert the children into
             * 
             * @returns {boolean}
             */
            const buildProjectTree = (
                project,
                menu,
                depth = 0,
            ) => {
                let is_active = this.active_project === project.name;
                if (project.children.length === 0) {
                    // the project is a leaf and can be added as a button
                    let item = new FoldoutLeaf(project.name, this);

                    this.bind_property('active-project', item, 'active-project',
                        GObject.BindingFlags.SYNC_CREATE | GObject.BindingFlags.DEFAULT);

                    menu.addMenuItem(item);
                } else {
                    // the project has children and needs to be added as a submenu
                    const submenu = new Foldout(project.name, depth === 0, this, depth);

                    this.bind_property('active-project', submenu, 'active-project',
                        GObject.BindingFlags.SYNC_CREATE | GObject.BindingFlags.DEFAULT);


                    let self_active = this.active_project === project.name;
                    for (const child of project.children) {
                        is_active |= buildProjectTree(child, submenu, depth + 1);
                    }
                    // if this is active it should not be open, only if it isn't and a child is active
                    if (is_active || (self_active && depth === 0)) submenu.open(false);

                    menu.addMenuItem(submenu);
                }
                return is_active;
            }

            if (open || !this.menu_open) {
                // clear the section
                this.item_projects_section.removeAll();

                getProjectTree.bind(this)(this._proc, (projects, active) => {
                    this.active_project = active;
                    if (this.menu_open) {
                        buildProjectTree(projects, this.item_projects_section);
                    }
                    this.searchProvider?.update_project_list(projects)
                });
            }
        }

        change_project(name, close = true) {
            this.active_project = name;
            // this.panelIcon.text = name;

            this._proc?.force_exit();

            this._proc = callChangeProject(name);
            if (close) {
                // Close the Menu
                this.menu.close();
            }
        }

        destroy() {
            this.item_projects_section.removeAll();
            this._proc?.force_exit();
            this.searchProvider = null;
            super.destroy()
        }
    });

function _switchInputSource(display, window, event, binding) {
    if (this._indicator.installed !== true) {
        return
    }
    console.log("---- Test-------");
    getProjectTree.bind(this)(this._proc, (projects, active) => {
        let icons = getIcons(projects)

        let _switcherPopup = new ProjectSwitcherPopup(this._keybindingAction, this._keybindingActionBackwards, this._indicator, binding, projects, active, icons);
        _switcherPopup.connect('destroy', () => {
            _switcherPopup = null;
        });
        if (!_switcherPopup.show(binding.get_name().endsWith("backward"), binding.get_name(), binding.get_mask()))
            _switcherPopup.fadeAndDestroy();
    })

}

class DbusService {
    Reload() {
        this._indicator.updateUI();
    }
}

export default class WechselExtension extends Extension {

    constructor(uuid) {
        super(uuid);
        this._uuid = uuid;
    }

    enable() {
        this._indicator = new Indicator(this);

        this.settings = this.getSettings();
        this.settings.bind('show-indicator', this._indicator, 'visible', Gio.SettingsBindFlags.DEFAULT);

        this._keybindingAction =
            wm.addKeybinding('switch-projects',
                this.settings,
                Meta.KeyBindingFlags.NONE,
                Shell.ActionMode.NORMAL,
                _switchInputSource.bind(this));

        this._keybindingActionBackwards =
            wm.addKeybinding('switch-projects-backward',
                this.settings,
                Meta.KeyBindingFlags.NONE,
                Shell.ActionMode.NORMAL,
                _switchInputSource.bind(this));

        let serviceInstance = null;
        this.exportedObject = null;

        function onBusAcquired(connection) {
            // Create the class instance, then the D-Bus object
            serviceInstance = new DbusService();
            this.exportedObject = Gio.DBusExportedObject.wrapJSObject(interfaceXml, serviceInstance);
            serviceInstance._indicator = this._indicator;
            this.exportedObject.export(connection, '/org/gnome/shell/extensions/wechsel/service');
        }

        this.ownerId = Gio.bus_own_name(
            Gio.BusType.SESSION,
            'org.gnome.shell.extensions.wechsel',
            Gio.BusNameOwnerFlags.NONE,
            onBusAcquired.bind(this),
            () => { },
            () => { });

        if (this.settings.get_boolean('activate-search-provider')) {
            this._provider = new SearchProvider(this);
            registerProvider(this._provider)
            // Main.overview.searchController.addProvider(this._provider);
        }

        this._indicator.searchProvider = this._provider

        panel.addToStatusArea(this._uuid, this._indicator);
    }

    disable() {
        wm.removeKeybinding("switch-projects");
        wm.removeKeybinding("switch-projects-backward");

        this._indicator?.destroy();
        this._indicator = null;
        this.settings = null;

        this._proc?.force_exit();
        this._proc = null;


        this.exportedObject.unexport();

        if (this.ownerId) {
            Gio.bus_unown_name(this.ownerId);
        }

        if (this._provider !== null) {
            unregisterProvider(this._provider)
            // Main.overview.searchController.removeProvider(this._provider);
            this._provider.destroy();
            this._provider = null;
        }
    }
}