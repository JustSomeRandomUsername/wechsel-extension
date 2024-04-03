/* extension.js
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

/* exported init */

// const GETTEXT_DOMAIN = 'project-switcher-extension';

import St from 'gi://St';
import Atk from 'gi://Atk';
import GObject from 'gi://GObject';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Meta from 'gi://Meta';
import Shell from 'gi://Shell';
import Clutter from 'gi://Clutter';

import { wm, panel } from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

import { getConfig } from './util/utils.js';
import { ProjectSwitcherPopup } from './util/projectSwitcher.js'

import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';

const interfaceXml = `
    <node>
        <interface name="org.gnome.shell.extensions.prjchange.service">
            <method name="Reload"/>
        </interface>
    </node>
`;


const FoldoutChildren = GObject.registerClass(
    class FoldoutChildren extends St.BoxLayout {
    _init() {
        super._init({
            vertical: true,
            x_expand: true,
            y_expand: true,
        });
        this.set_style('padding-left: 5px;');
    }
});

const Foldout = GObject.registerClass({
    Properties: {
        'unfolded': GObject.ParamSpec.boolean(
            'unfolded', 'unfolded', 'unfolded',
            GObject.ParamFlags.READWRITE,
            false
        ),
    }},
    class Foldout extends PopupMenu.PopupBaseMenuItem {
    _init(
        name,
        is_root = false,
        indicator = undefined,
        depth = 0
    ) {
        this.ignore_next_hover = false;
        this.is_root = is_root;
        this.indicator = indicator;
        this.project_name = name;
        this.depth = depth;

        super._init({
            activate: true,
            hover: true,
            can_focus: true,
            style_class: 'popup-menu-item',
        });

        this.box = new St.BoxLayout({
            vertical: true,
            x_expand: true,
            y_expand: true
        });

        this.header_box = new St.BoxLayout({
            vertical: false,
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
        this.box.add_actor(this.child_container);

        this.close();

        this.add_accessible_state(Atk.StateType.EXPANDABLE);
        this.add_actor(this.box);


        this.indicator.connect('close_submenus', (a, close_depth) => {
            if (close_depth === depth && this.unfolded) {
                this.close();
            }
        });
        if (this.is_root) {
            this.connect('enter-event', () => {
                if (this.ignore_next_hover) {
                    this.ignore_next_hover = false;
                } else {
                    this.set_hover(true);
                }
                return true;
            });
        }
    }

    activate(event) {
        console.log("activate", this.project_name);
        if (this.unfolded) {
            if (this.indicator) {
                this.indicator.change_project(this.project_name);
            }
        } else {
            this.open();
        }
    }

    addMenuItem(item) {
        this.child_container.add_actor(item);

        // disable hover when the child container is hovered and this item is hovered
        if (item.connect) {
            // disable hover when the child container is hovered and this item is hovered
            item.connect('enter-event', () => {
                if (this.hover) {
                    this.set_hover(false);
                    this.ignore_next_hover = true;
                }
                if (item.ignore_next_hover != undefined && item.ignore_next_hover) {
                    console.log("ignoring hover");
                    item.ignore_next_hover = false;
                    
                } else {
                    console.log("hovered item");
                    item.set_hover(true);
                }
                return true;
            });

            // close menu when left arrow key is pressed on child
            item.connect('key-press-event', (actor, event) => {
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
            });
        }
    }

    open() {
        this.indicator.emit('close_submenus', this.depth);
        this.unfolded = true;
        this._icon.icon_name = 'pan-down-symbolic';
        this.child_container.show();
        this.notify("unfolded");
    }

    close() {
        this.unfolded = false;
        this._icon.icon_name = 'pan-end-symbolic';
        this.child_container.hide();
        this.notify("unfolded");
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
        }

        return super.vfunc_key_press_event(event);
    }

    showOrnament() {
        this._ornament.show();
    }

    hideOrnament() {
        this._ornament.hide();
    }
});


const Indicator = GObject.registerClass(
    {
        Signals: {
            'close_submenus': {
                param_types: [GObject.TYPE_INT],
            },
        },
    },
    class Indicator extends PanelMenu.Button {

    _init(extension) {
        super._init(0.0, _('Project Indicator'));

        /**
         * The PopupMenu reference of the indicator
         * @type {PopupMenu.PopupMenu} */
        this.menu;

        /** 
         * reference to the extension object
         * @type {ProjectChangerExtension} */
        this.extension = extension;

        /**
         * @typedef {{ children: Project[], name: string}} Project
         */
        /**
         * reference to the current config object
         * @type {{active: string, all_prjs: Project}} */
        this.config = {};
        
        /** 
         * name of the active project
         * @type {string} */
        this.active = "";

        /**
         * tracks the state of the menu
         * @type {boolean} */
        this.menu_open = false;

        this.current_path = ["default"];
        const filepath2 = GLib.build_filenamev([GLib.get_home_dir(), 'Desktop']);
        const file2 = Gio.File.new_for_path(filepath2);
        const info = file2.query_info('standard::*',Gio.FileQueryInfoFlags.NOFOLLOW_SYMLINKS, null);
        
        if (info.get_is_symlink()) {
            const a = info.get_symlink_target().split("/");
            this.active = a[a.length -2];//TODO this seems wrong it should read the json file
        }
        
        /**
         * Text label inside the button indicator
         * @type {St.Label}
         */
        this.panelIcon = new St.Label({
            text: this.active,
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
                // refresh the popupmenu
                this.updateUI();
            }
        });

        /**
         * section for all projects. this will be rerendered dynamically
         * @type {PopupMenu.PopupMenuSection} */
        this.item_projects_section = new PopupMenu.PopupMenuSection();
        this.menu.addMenuItem(this.item_projects_section);

        // seperator between the projects and the settings
        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        /**
         * reference to the Settings item in the menu
         * @type {PopupMenu.PopupMenuItem} */
        this.item_settings = new PopupMenu.PopupMenuItem(_('Settings'));
        // open preferences page when settings is activated
        this.item_settings.connect('activate', () => {
            this.extension.openPreferences();
        });
        this.menu.addMenuItem(this.item_settings);

        // initial update
        this.updateUI();
    }

    updateUI() {
        // loads current config
        this.config = getConfig();
        this.active = this.config.active;
        
        // sets the active project name to the indicator button
        this.panelIcon.text = this.active;
        
        // clear the section
        this.item_projects_section.removeAll();

        /**
         * Inserts all children of a project into the menu
         * 
         * @param {Project} project project object from the config
         * @param {PopupMenu.PopupMenuSection | PopupMenu.PopupSubMenuMenuItem} menu parent object to insert the children into
         * 
         * @returns {boolean}
         */
        const buildProjectTree = (
            project,
            menu,
            depth = 0,
        ) => {
            let is_active = project.name == this.active;
            if (project.children.length == 0) {
                // the project is a leaf and can be added as a button
                let item = new PopupMenu.PopupMenuItem(project.name);
                menu.addMenuItem(item);

                if (is_active) item.setOrnament(PopupMenu.Ornament.CHECK);

                item.connect('activate', () => {
                    this.change_project(project.name);
                });
            } else {
                // the project has children and needs to be added as a submenu
                const submenu = new Foldout(project.name, depth == 0, this, depth);
                
                if(is_active) submenu.showOrnament();

                menu.addMenuItem(submenu);
                let was_active = is_active;
                for (const child of project.children) {
                    is_active |= buildProjectTree(child, submenu, depth + 1);
                }
                // if this is active it should not be open, only if it isnt and a child is active
                if (is_active && !was_active) submenu.open();
            }
            return is_active;
        }

        buildProjectTree(this.config.all_prjs, this.item_projects_section);
    }

    change_project(name) {
        this.active = name;
        this.panelIcon.text = name;
        Gio.Subprocess.new(
            [GLib.build_filenamev([GLib.get_home_dir(), '.local/bin/change-prj']), name],//TODO find a better way to get the path of the executable 
            Gio.SubprocessFlags.NONE
        );
        this.menu.close();
    }
});

function _switchInputSource(display, window, binding) {
    let config = getConfig();
    let _switcherPopup = new ProjectSwitcherPopup([config.all_prjs, ...config.all_prjs.children], this._keybindingAction, this._keybindingActionBackwards, this._indicator, binding, [], config.active);
    _switcherPopup.connect('destroy', () => {
        _switcherPopup = null;
    });
    if (!_switcherPopup.show(binding.get_name().endsWith("backward"), binding.get_name(), binding.get_mask()))
        _switcherPopup.fadeAndDestroy();

}

export default class ProjectChangerExtension extends Extension {
    constructor(uuid) {
        super(uuid);
        this._uuid = uuid;
    }

    enable() {
        this._indicator = new Indicator(this);
        panel.addToStatusArea(this._uuid, this._indicator);

        this.settings = this.getSettings();
        this.settings.bind('show-indicator', this._indicator, 'visible', Gio.SettingsBindFlags.DEFAULT);
        
        this._keybindingAction =
            wm.addKeybinding('switch-projects',
                this.settings_new_schema(this.metadata["settings-schema"]),
                Meta.KeyBindingFlags.NONE,
                Shell.ActionMode.NORMAL,
                _switchInputSource.bind(this));

        this._keybindingActionBackwards =
            wm.addKeybinding('switch-projects-backward',
                this.settings_new_schema(this.metadata["settings-schema"]),
                Meta.KeyBindingFlags.NONE,
                Shell.ActionMode.NORMAL,
                _switchInputSource.bind(this));

        let serviceInstance = null;
        let exportedObject = null;
        
        function onBusAcquired(connection) {
            // Create the class instance, then the D-Bus object
            serviceInstance = new DbusService();
            exportedObject = Gio.DBusExportedObject.wrapJSObject(interfaceXml, serviceInstance);
            serviceInstance._indicator = this._indicator;
            exportedObject.export(connection, '/org/gnome/shell/extensions/prjchange/service');
        }

        this.ownerId = Gio.bus_own_name(
            Gio.BusType.SESSION,
            'org.gnome.shell.extensions.prjchange',
            Gio.BusNameOwnerFlags.NONE,
            onBusAcquired.bind(this),
            () => {},
            () => {});           
    }

    disable() {
        this._indicator.destroy();
        this._indicator = null;
        wm.removeKeybinding("switch-projects");
        wm.removeKeybinding("switch-projects-backward");

        Gio.bus_unown_name(this.ownerId);
    }

    settings_new_schema(schema) {
        const GioSSS = Gio.SettingsSchemaSource;
        const schemaDir = this.dir.get_child("schemas");
    
        let schemaSource = schemaDir.query_exists(null) ?
            GioSSS.new_from_directory(schemaDir.get_path(), GioSSS.get_default(), false) :
            GioSSS.get_default();
    
        const schemaObj = schemaSource.lookup(schema, true);
    
        if (!schemaObj) {
            throw new Error("Schema " + schema + " could not be found for extension "
                + this.metadata.uuid + ". Please check your installation.")
        }
        return new Gio.Settings({ settings_schema: schemaObj });
    }
}

class DbusService {
    Reload() {
        this._indicator.updateUI();
    }
}


export { Indicator }