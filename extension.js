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

const GETTEXT_DOMAIN = 'my-indicator-extension';

const { GObject, St } = imports.gi;

const Me = imports.misc.extensionUtils.getCurrentExtension();
const Dialog = imports.ui.dialog;
const ModalDialog = imports.ui.modalDialog;
const BoxPointer = imports.ui.boxpointer;

const ExtensionUtils = imports.misc.extensionUtils;
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const { Gio, GLib } = imports.gi;
const Util = imports.misc.util;
const Clutter = imports.gi.Clutter;

const { wm } = imports.ui.main;
const { Meta, Shell } = imports.gi;

const { getConfig } = Me.imports.util.utils;
const { ProjectSwitcherPopup } = Me.imports.util.projectSwitcher;


const _ = ExtensionUtils.gettext;

var PopupMenuSection = class extends PopupMenu.PopupMenuBase {
    constructor() {
        super();


        this._arrowAlignment = arrowAlignment;
        this._arrowSide = arrowSide;


        this.actor = this.box;
        this.actor._delegate = this;
        this.isOpen = true;
        this._boxPointer = new BoxPointer.BoxPointer(arrowSide);
        this.actor = this._boxPointer;
        this.actor._delegate = this;

        this._boxPointer.bin.set_child(this.box);

        this.actor.add_style_class_name('popup-menu-section');
    }

    open(animate) {
        if (this.isOpen)
            return;

        if (this.isEmpty())
            return;

        if (!this._systemModalOpenedId) {
            this._systemModalOpenedId =
                Main.layoutManager.connect('system-modal-opened', () => this.close());
        }

        this.isOpen = true;

        this._boxPointer.setPosition(this.sourceActor, this._arrowAlignment);
        this._boxPointer.open(animate);

        this.actor.get_parent().set_child_above_sibling(this.actor, null);

        this.emit('open-state-changed', true);
    }

    close(animate) {
        if (this._activeMenuItem)
            this._activeMenuItem.active = false;

        if (this._boxPointer.visible) {
            this._boxPointer.close(animate, () => {
                this.emit('menu-closed');
            });
        }

        if (!this.isOpen)
            return;

        this.isOpen = false;
        this.emit('open-state-changed', false);
    }


};


const Indicator = GObject.registerClass(
class Indicator extends PanelMenu.Button {

    _init() {
        super._init(0.0, _('Project Indicator'));

        this.config = {};
        this.active = "";
        this.current_path = ["default"];
        const filepath2 = GLib.build_filenamev([GLib.get_home_dir(), 'Desktop']);
        const file2 = Gio.File.new_for_path(filepath2);
        const info = file2.query_info('standard::*',Gio.FileQueryInfoFlags.NOFOLLOW_SYMLINKS, null);
        
        if (info.get_is_symlink()) {
            const a = info.get_symlink_target().split("/");
            this.active = a[a.length -2];
        }
        
        this.panelIcon = new St.Label({
            text: this.active,
            y_align: Clutter.ActorAlign.CENTER,
        })

        this.add_child(this.panelIcon);

        this.menu.connect('open-state-changed', (menu, open) => {
            if (open) {
                this.updateUI();
            } 
        });
        this.updateUI();
    }

    updateUI() {
        this.menu.removeAll();
        
        const items = []
        this.config = getConfig();
        this.active = this.config.active;
        
        this.panelIcon.text = this.active;
        
        const addItem = (prj, menu, path, depth) => {
            let item = menu.addAction(prj.name, () => {
                for (const i of items) {
                    i.setOrnament(PopupMenu.Ornament.NONE);
                }
                item.setOrnament(PopupMenu.Ornament.CHECK);
                this.change_project(prj.name);
                // this.updateUI();

            }, /*prj.children.length > 0 ? 'pan-end-symbolic' : ''*/)
            if (prj.children.length > 0) {
                item._getTopMenu().itemActivated = () => {};
            }
            if (this.active != "" && prj.name == this.active) {
                item.setOrnament(PopupMenu.Ornament.CHECK)
            }
            items.push(item);
            if (prj.children.length > 0) {
                // if (this.current_path.join().startsWith(path.join())) {
                    const section = new PopupMenu.PopupMenuSection();
                    for (const child of prj.children) {
                        addItem(child, section, path.concat(child.name) ,depth+1);
                    }
                    section.close();
                    menu.addMenuItem(section);
                // }
            }
        };

        addItem(this.config.all_prjs, this.menu, ["default"], 0);

        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        const new_project = new PopupMenu.PopupMenuItem(_('New Workspace'));
        new_project.connect('activate', () => {
            ExtensionUtils.openPrefs()
            // Util.spawn(["gnome-extensions", "prefs", Me.metadata.uuid]);
        });
        this.menu.addMenuItem(new_project);
    }

    change_project(name) {
        this.active = name;
        this.panelIcon.text = name;
        Gio.Subprocess.new(
            ['/home/purple/.local/bin/change-prj',name],
            Gio.SubprocessFlags.NONE
        );
        dbusReload();
    }
});

function dbusReload() {
    const connection = Gio.DBus.session;
        
    for (let i=0;i<20;i++) {
        const notification = new GLib.Variant('(sava{sv})', ['reload',[],[]]);
        connection.call(
            'org.gnome.Nautilus',
            '/org/gnome/Nautilus/window/'+i,
            'org.gtk.Actions',
            'Activate',
            notification,
            null,
            Gio.DBusCallFlags.NONE,
            -1,
            null,
            (connection, res) => {}
        );
    }
    const notification = new GLib.Variant('(sava{sv})', ['updateDesktop',[],[]]);
    connection.call(
        'com.desktop.ding',
        '/com/desktop/ding',
        'org.gtk.Actions',
        'Activate',
        notification,
        null,
        Gio.DBusCallFlags.NONE,
        -1,
        null,
        (connection, res) => {}
    );
}

function _switchInputSource(display, window, binding) {
    let config = getConfig();
    _switcherPopup = new ProjectSwitcherPopup([config.all_prjs, ...config.all_prjs.children], this._keybindingAction, this._keybindingActionBackwards, this._indicator, binding, [], config.active);
    _switcherPopup.connect('destroy', () => {
        _switcherPopup = null;
    });
    if (!_switcherPopup.show(binding.is_reversed(), binding.get_name(), binding.get_mask()))
        _switcherPopup.fadeAndDestroy();

}

class Extension {
    constructor(uuid) {
        this._uuid = uuid;
        ExtensionUtils.initTranslations(GETTEXT_DOMAIN);
    }

    enable() {
        this._indicator = new Indicator();
        Main.panel.addToStatusArea(this._uuid, this._indicator);

        this._keybindingAction =
            wm.addKeybinding('next-project',
                settings_new_schema(Me.metadata["settings-schema"]),
                Meta.KeyBindingFlags.NONE,
                Shell.ActionMode.NORMAL,
                _switchInputSource.bind(this));

        this._keybindingActionBackwards =
            wm.addKeybinding('previous-project',
                settings_new_schema(Me.metadata["settings-schema"]),
                Meta.KeyBindingFlags.NONE,
                Shell.ActionMode.NORMAL,
                _switchInputSource.bind(this));
    }

    disable() {
        this._indicator.destroy();
        this._indicator = null;
        wm.removeKeybinding("next-project");
        wm.removeKeybinding("previous-project");
    }
}

function init(meta) {
    return new Extension(meta.uuid);
}


function settings_new_schema(schema) {
    const GioSSS = Gio.SettingsSchemaSource;
    const schemaDir = Me.dir.get_child("schemas");

    let schemaSource = schemaDir.query_exists(null) ?
        GioSSS.new_from_directory(schemaDir.get_path(), GioSSS.get_default(), false) :
        GioSSS.get_default();

    const schemaObj = schemaSource.lookup(schema, true);

    if (!schemaObj) {
        throw new Error("Schema " + schema + " could not be found for extension "
            + Me.metadata.uuid + ". Please check your installation.")
    }
    return new Gio.Settings({ settings_schema: schemaObj });
}
