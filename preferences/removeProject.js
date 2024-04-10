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

import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import GObject from 'gi://GObject';
import Gio from 'gi://Gio';

import { gettext as _ } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
import { getConfig } from '../util/utils.js';

export const RemovePage = GObject.registerClass(
class RemoveProjectPage extends Adw.PreferencesPage {
    constructor(window) {
        super({
            title: _('Remove Project'),
            icon_name: 'edit-delete-symbolic',
            name: 'RemoveProjectPage'
        });

        // Remove Project Page
        const rm_prj_group = new Adw.PreferencesGroup();
        this.add(rm_prj_group);
    
        const is_delete_row = new Adw.ActionRow({
            title: 'Remove Current Project',
            subtitle: 'This will not remove any files, just the project from the config.'
        });
    
        const removeButton = new Gtk.Button({
            label: 'Remove',
            valign: Gtk.Align.CENTER,
            halign: Gtk.Align.END,
            cssClasses: ['raised'],
        });

        removeButton.connect('clicked', () => {
            let config = getConfig();
            let prj_name = config.active;
            const message = 'Are you sure you want to remove "'+ prj_name +'"?';
    
            //  Create a dialog to confirm the action
            const dialog = new Gtk.AlertDialog({
                message: message,
                detail: 'Removing a project will remove it and all its children from the config, but not delete any of the files.',
                modal: true,
                buttons: [
                        'Cancel',
                        'Remove: ' + prj_name,
                ],
            });
    
            dialog.choose(window, null, (a,b) => {
                if (a.choose_finish(b) === 1) {
                    const proc = Gio.Subprocess.new(
                        ["wechsel",
                            prj_name,
                            'remove', 
                        ],
                        Gio.SubprocessFlags.NONE
                    );

                    proc.communicate_utf8_async(null, null, (subprocess /*@type {Gio.Subprocess}*/, result /*@type {Gio.AsyncResult}*/, _data) => {
                        const [success, _stdout, stderr] = proc.communicate_utf8_finish(result)
                        if (!success) {
                            //  Create a dialog to show the error
                            const dialog2 = new Gtk.AlertDialog({
                                message: 'An error occurred while removing the project',
                                detail: stderr,
                                modal: true,
                                buttons: [
                                        'Ok',
                                ],
                            });
                            dialog2.show();
                        }
                    });
                }
            });
        });

        is_delete_row.add_suffix(removeButton);    

        const open_project_folder = new Adw.ActionRow({
            title: 'Open Project Folder in File Manager',
            subtitle: 'So you can delete the folder yourself'
        });


        const openButton = new Gtk.Button({
            label: 'Open',
            valign: Gtk.Align.CENTER,
            halign: Gtk.Align.END,
            cssClasses: ['raised'],
        });
        open_project_folder.add_suffix(openButton);
        openButton.connect('clicked', () => {
            const config = getConfig();
            
            let proc = Gio.Subprocess.new(
                ["wechsel",
                    config.active,
                    "get-path",
                ],
                Gio.SubprocessFlags.STDOUT_PIPE
            );

            proc.communicate_utf8_async(null, null, (subprocess /*@type {Gio.Subprocess}*/, result /*@type {Gio.AsyncResult}*/, _data) => {
                const [_success, stdout, _stderr] = proc.communicate_utf8_finish(result)
                if (stdout !== "") {
                    const folder = 'file://'+stdout.trim();
                    Gio.AppInfo.launch_default_for_uri(folder, null);
                }
            });
        });

        rm_prj_group.add(is_delete_row);
        rm_prj_group.add(open_project_folder);
    }
});