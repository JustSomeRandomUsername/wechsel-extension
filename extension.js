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

const ExtensionUtils = imports.misc.extensionUtils;
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const {Gio, GLib} = imports.gi;
const Clutter = imports.gi.Clutter;

const { wm } = imports.ui.main;
const { Meta, Shell } = imports.gi;

const _ = ExtensionUtils.gettext;

const ws_folder = "ws/";

const Indicator = GObject.registerClass(
class Indicator extends PanelMenu.Button {

    _init() {
        super._init(0.0, _('Ws Indicator'));

        this.ws_names = [];
        this.active = "";
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

        this.updateUI();
    }

    updateUI() {
        this.menu.removeAll();
        this.panelIcon.text = this.active;
        
        const filepath = GLib.build_filenamev([GLib.get_home_dir(), ws_folder]);
        const file = Gio.File.new_for_path(filepath);

        const items = []
        this.ws_names = getWS(file);
        for (let name of this.ws_names) {
            let item = new PopupMenu.PopupMenuItem(_(name));
            if (this.active != "" && name == this.active) {
                item.setOrnament(PopupMenu.Ornament.CHECK)
            }
            
            item.connect('activate', () => {
                for (const i of items) {
                    i.setOrnament(PopupMenu.Ornament.NONE);
                }
                item.setOrnament(PopupMenu.Ornament.CHECK);
                this.change_ws(name);
            });
            items.push(item);
            this.menu.addMenuItem(item);
        }

        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        const new_ws = new PopupMenu.PopupMenuItem(_('New Workspace'));
        new_ws.connect('activate', () => {
            this.newWsDialog();
        });
        this.menu.addMenuItem(new_ws);
    }

    change_ws(name) {
        this.active = name;
        this.panelIcon.text = name;
        GLib.spawn_command_line_sync(GLib.build_filenamev([GLib.get_home_dir(), ws_folder, "change-prj "]) + name);
    }

    newWsDialog() {
        // Creating a modal dialog
        let wsDialog = new ModalDialog.ModalDialog({
            destroyOnClose: true,
        });  
    
        // Adding a Entry widget to the content area
        const nameEntry = new St.Entry({
            hint_text: 'Workspace Name',
            can_focus: true,
        });
    
        nameEntry.connect("key-press-event", (widget, event) => {
            if (event.get_key_symbol() === Clutter.KEY_Escape) {
                wsDialog.close();
    
            } else if (event.get_key_symbol() === Clutter.KEY_Enter) {
                wsDialog.close(global.get_current_time());
            }
        });
        
    
        wsDialog.setInitialKeyFocus(nameEntry);
    
        wsDialog.contentLayout.add_child(nameEntry);
    
        let closedId = wsDialog.connect('closed', (_dialog) => {
            createWorkspace(nameEntry.get_text());
            this.change_ws(nameEntry.get_text());
            this.updateUI();
            // _dialog.destroy();
        });
    
        // The dialog was destroyed, so reset everything
        wsDialog.connect('destroy', (_actor) => {
            if (closedId) {
                wsDialog.disconnect(closedId);
                closedId = null;
            }
            wsDialog = null;
        });
    
        // Adding buttons
        wsDialog.setButtons([{
                label: 'Close',
                isDefault: false,
                action: () => wsDialog.destroy(),
            },{
                label: 'Create',
                isDefault: true,
                action: () => wsDialog.close(global.get_current_time()),
            },
        ]);
        wsDialog.open(global.get_current_time());
        // global.stage.set_key_focus(nameEntry);
    
    }
});

function createWorkspace(name) {
    const folder = Gio.File.new_for_path(GLib.build_filenamev([GLib.get_home_dir(), ws_folder, name]));
    folder.make_directory(null);
    for (const f of ["Desktop", "Documents", "Downloads", "Music", "Pictures", "Videos"]) {
        folder.get_child(f).make_directory(null);
    }
}

function getWS(directory) {
    const ws = []
    const iter = directory.enumerate_children('standard::*',
        Gio.FileQueryInfoFlags.NOFOLLOW_SYMLINKS, null);

    while (true) {
        const info = iter.next_file(null);
        
        if (info == null)
            break;
        
        if (info.get_file_type() == 2) {
            ws.push(info.get_name())
        }
    }
    
    return ws;
}

function getWS(directory) {
    const ws = []
    const iter = directory.enumerate_children('standard::*',
        Gio.FileQueryInfoFlags.NOFOLLOW_SYMLINKS, null);

    while (true) {
        const info = iter.next_file(null);
        
        if (info == null)
            break;
        
        if (info.get_file_type() == 2) {
            ws.push(info.get_name())
        }
    }
    
    return ws;
}

class Extension {
    constructor(uuid) {
        this._uuid = uuid;
        ExtensionUtils.initTranslations(GETTEXT_DOMAIN);
    }

    enable() {
        this._indicator = new Indicator();
        Main.panel.addToStatusArea(this._uuid, this._indicator);

        wm.addKeybinding(
            "next-ws",
            settings_new_schema(Me.metadata["settings-schema"]),
            Meta.KeyBindingFlags.NONE,
            Shell.ActionMode.NORMAL,
            () => {
                    let idx = this._indicator.ws_names.findIndex(a => a == this._indicator.active);
                    this._indicator.change_ws(this._indicator.ws_names[(idx + 1) % this._indicator.ws_names.length]);
                    this._indicator.updateUI();
                }
            );
    }

    disable() {
        this._indicator.destroy();
        this._indicator = null;
        wm.removeKeybinding("next-ws")
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
