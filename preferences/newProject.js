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
import { getConfig } from '../util/utils.js';

import { gettext as _ } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export const NewPage = GObject.registerClass(
class NewProjectPage extends Adw.PreferencesPage {
    constructor(config, window) {
        super({
            title: _('New Project'),
            icon_name: 'document-new-symbolic',
            name: 'NewProjectPage'
        });

        // New Project Page
        const add_prj_group = new Adw.PreferencesGroup();
        this.add(add_prj_group);
    
        // Setup List of All Project Names 
        this.name_list = new Gtk.StringList();
    
        // Parent Selector 
        this.parentRow = new Adw.ComboRow({
            title: 'Parent',
            model: this.name_list,
        });
        add_prj_group.add(this.parentRow);
    
        // Name Entry
        const entryRow = new Adw.ActionRow({ title: _('Name') });
        add_prj_group.add(entryRow);
    
        const name = new Gtk.Entry({
            placeholder_text: 'Project name',
        });
        entryRow.add_suffix(name);
    
        // Folder Toggles
        const folders = [];
        for (const folder of [["Music","folder-music"], ["Videos", "folder-videos"], 
                                ["Pictures", "folder-pictures"], ["Desktop","user-desktop"], 
                                ["Documents", "folder-documents"], ["Downloads", "folder-download"]]) {
            const row = new Adw.ActionRow({ title: folder[0] });
            add_prj_group.add(row);
            const toggle = new Gtk.Switch({
                active: true,
                valign: Gtk.Align.CENTER,
            });
            folders.push([toggle, folder[0]]);
            row.add_suffix(toggle);
            const icon = new Gtk.Image({
                icon_name: ""+folder[1],
            });
            row.add_prefix(icon);
        }

        // Create Button
        const createButton = new Gtk.Button({
            label: 'Add new',
            valign: Gtk.Align.CENTER,
            halign: Gtk.Align.END,
            cssClasses: ['raised'],
        });
        add_prj_group.add(createButton);
    
        createButton.connect('clicked', () => {
            this.proc = Gio.Subprocess.new(
                ["wechsel",
                    'new',
                    name.text,
                    '--parent', this.name_list.get_string(this.parentRow.get_selected()),
                    '--folders=' +folders.filter((x) => x[0].active).map((x) => x[1]).join(" "),
                ],
                Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE
            );
            this.proc.communicate_utf8_async(null, null, (subprocess /*@type {Gio.Subprocess}*/, result /*@type {Gio.AsyncResult}*/, _data) => {
                const [_success, _stdout, stderr] = this.proc.communicate_utf8_finish(result)
                if (stderr !== "") {
                    //  Create a dialog to show the error
                    const dialog = new Gtk.AlertDialog({
                        message: 'An error occurred while adding the project',
                        detail: stderr,
                        modal: true,
                        buttons: [
                                'Ok',
                        ],
                    });
                    dialog.show(window);
                }
                this.parentRow.set_model(this.updateProjectList());
            });
            
            // Reset the form
            name.text = "";
            for (const folder of folders) {
                folder[0].active = true;
            }
            this.parentRow.set_selected(0);
        });


        this.connect('map', () => {
            this.parentRow.set_model(this.updateProjectList());
        });
    }

    updateProjectList() {
        const config = getConfig();
        // Setup List of All Project Names 
        this.name_list = new Gtk.StringList();
        const addItem = (prj) => {
            this.name_list.append(prj.name)
            for (const child of prj.children) {
                addItem(child);
            }
        }
        addItem(config.all_prjs);

        return this.name_list;
    }

    destroy() {
        super.destroy();
        this.proc.force_exit();
        this.proc = null;
        this.name_list = null;
    }
});