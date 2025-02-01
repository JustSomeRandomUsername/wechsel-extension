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
import { getProjectTree } from '../util/utils.js';

import { gettext as _ } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export const NewPage = GObject.registerClass(
    class NewProjectPage extends Adw.PreferencesPage {
        constructor(window) {
            super({
                title: _('New Project'),
                icon_name: 'document-new-symbolic',
                name: 'NewProjectPage'
            });

            // New Project Group
            const add_prj_group = new Adw.PreferencesGroup();
            this.add(add_prj_group);

            let overlay = new Gtk.Overlay({
                halign: Gtk.Align.CENTER,
                valign: Gtk.Align.CENTER,
            });
            let iconBox = new Gtk.Box({
                homogeneous: false,
                orientation: Gtk.Orientation.VERTICAL
            });
            iconBox.append(overlay)
            add_prj_group.add(iconBox)

            const fileDialog = new Gtk.FileDialog();
            const icon = new Gtk.Image({
                pixel_size: 64 * 2
            })

            overlay.add_css_class('bordered-image')

            const openButton = new Gtk.Button({
                valign: Gtk.Align.END,
                halign: Gtk.Align.END,
                icon_name: "document-open",
            });
            let iconFile;
            openButton.connect('clicked', () => {
                fileDialog.open(window, null, (dialog, res) => {
                    iconFile = dialog.open_finish(res)
                    icon.set_from_file(iconFile.get_path())
                });
            });

            overlay.add_overlay(openButton);
            overlay.set_child(icon);

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

            const name_input = new Gtk.Entry({
                placeholder_text: 'Project name',
            });
            entryRow.add_suffix(name_input);

            // Folder Toggles
            const folders = [];
            // TODO Change defaults to be what the selected parent has 
            for (const folder of [["Music", "folder-music"], ["Videos", "folder-videos"],
            ["Pictures", "folder-pictures"], ["Desktop", "user-desktop"],
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
                    icon_name: "" + folder[1],
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
                let name = name_input.text;
                this._proc = Gio.Subprocess.new(
                    ["wechsel",
                        'new',
                        name,
                        '--parent', this.name_list.get_string(this.parentRow.get_selected()),
                        '--folders=' + folders.filter((x) => x[0].active).map((x) => x[1]).join(" "),
                    ],
                    Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE
                );
                this._proc.communicate_utf8_async(null, null, (subprocess /*@type {Gio.Subprocess}*/, result /*@type {Gio.AsyncResult}*/, _data) => {
                    const [_success, _stdout, stderr] = this._proc.communicate_utf8_finish(result)
                    if (stderr !== "") {
                        Main.notifyError('An error occurred while adding the project', stderr);
                    }

                    if (iconFile) {
                        this._proc = Gio.Subprocess.new(
                            ["wechsel", "path", name],
                            Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE
                        );

                        this._proc.communicate_utf8_async(null, null, (subprocess /*@type {Gio.Subprocess}*/, result /*@type {Gio.AsyncResult}*/, _data) => {
                            const [_success, stdout, stderr] = this._proc.communicate_utf8_finish(result)
                            if (stderr !== "") {
                                Main.notifyError('An error occurred while adding the project', stderr);
                            }
                            if (stdout !== "") {
                                let suffix = iconFile.get_basename().split('.')
                                if (suffix.length > 1) {
                                    let target = Gio.File.new_for_path(`${stdout.trim()}/icon.${suffix.pop()}`)
                                    iconFile.copy(target, Gio.FileQueryInfoFlags.NONE, null, null)

                                    const folder = `file://${stdout.trim()}`;
                                    Gio.AppInfo.launch_default_for_uri(folder, null);

                                }
                            }
                        });
                    }

                    this.updateProjectList();

                });

                // Reset the form
                name_input.text = "";
                for (const folder of folders) {
                    folder[0].active = true;
                }
                this.parentRow.set_selected(0);
            });


            this.connect('map', () => {
                this.updateProjectList();
            });
        }

        updateProjectList() {
            getProjectTree.bind(this)(this._proc, (projects) => {
                // Setup List of All Project Names 
                this.name_list = new Gtk.StringList();
                const addItem = (prj) => {
                    this.name_list.append(prj.name)
                    for (const child of prj.children) {
                        addItem(child);
                    }
                }
                addItem(projects);

                this.parentRow.set_model(this.name_list)
            });
        }

        destroy() {
            this._proc.force_exit();
            this._proc = null;
            this.name_list = null;
            super.destroy();
        }
    });