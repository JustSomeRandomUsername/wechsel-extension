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
import GLib from 'gi://GLib';

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
            const addPrjGroup = new Adw.PreferencesGroup();
            this.add(addPrjGroup);

            // Setup List of All Project Names 
            this.name_list = new Gtk.StringList();

            // Parent Selector 
            this.parentRow = new Adw.ComboRow({
                title: 'Parent',
                model: this.name_list,
            });
            addPrjGroup.add(this.parentRow);

            // Name Entry
            const entryRow = new Adw.ActionRow({ title: _('Name') });
            addPrjGroup.add(entryRow);

            const name_input = new Gtk.Entry({
                placeholder_text: 'Project name',
            });
            // Update Icon Label in case the icon file is not set
            name_input.connect('changed', (entry) => {
                if (!this.iconFile) {
                    this.iconLabel.set_markup_with_mnemonic(`<span font="42">${entry.text.substring(0, 3)}</span>`)
                }
            })

            // Icon
            addPrjGroup.add(this.setupIcon(window))

            entryRow.add_suffix(name_input);

            // Folder Toggles
            const folders = [];
            // TODO Change defaults to be what the selected parent has 
            for (const folder of [["Music", "folder-music"], ["Videos", "folder-videos"],
            ["Pictures", "folder-pictures"], ["Desktop", "user-desktop"],
            ["Documents", "folder-documents"], ["Downloads", "folder-download"]]) {
                const row = new Adw.ActionRow({ title: folder[0] });
                addPrjGroup.add(row);
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

            const plugins = this.setupPlugins(addPrjGroup)

            // Create Button
            const createButton = new Gtk.Button({
                label: 'Add new',
                valign: Gtk.Align.CENTER,
                halign: Gtk.Align.END,
                cssClasses: ['raised'],
            });
            addPrjGroup.add(createButton);

            createButton.connect('clicked', () => {
                let name = name_input.text;

                if (name === "") {
                    return
                }

                let launcher = new Gio.SubprocessLauncher({
                    flags: Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE,
                });

                const plugin_env = plugins.filter((x) => x[1].active).map((x) => x[0]).join(";")
                // Set an environment variable
                launcher.setenv("PLUGINS", plugin_env, true);

                // Launch a subprocess (Example: `env` to check environment variables)
                this._proc = launcher.spawnv(["wechsel",
                    'new',
                    name,
                    '--parent', this.name_list.get_string(this.parentRow.get_selected()),
                    '--folders=' + folders.filter((x) => x[0].active).map((x) => x[1]).join(" "),
                ]);

                this._proc.communicate_utf8_async(null, null, (subprocess /*@type {Gio.Subprocess}*/, result /*@type {Gio.AsyncResult}*/, _data) => {
                    const [_success, _stdout, _stderr] = this._proc.communicate_utf8_finish(result)
                    // if (stderr !== "") {
                    //     Main.notifyError('An error occurred while adding the project', stderr);
                    // }

                    if (this.iconFile) {
                        this._proc = Gio.Subprocess.new(
                            ["wechsel", "path", name],
                            Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE
                        );

                        this._proc.communicate_utf8_async(null, null, (subprocess /*@type {Gio.Subprocess}*/, result /*@type {Gio.AsyncResult}*/, _data) => {
                            const [_success, stdout, _stderr] = this._proc.communicate_utf8_finish(result)
                            // if (stderr !== "") {
                            //     Main.notifyError('An error occurred while adding the project', stderr);
                            // }
                            if (stdout !== "") {
                                let suffix = this.iconFile.get_basename().split('.')
                                if (suffix.length > 1) {
                                    let target = Gio.File.new_for_path(`${stdout.trim()}/icon.${suffix.pop()}`)
                                    this.iconFile.copy(target, Gio.FileQueryInfoFlags.NONE, null, null)

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

        setupPlugins(group) {
            const plugins = []
            group.add(new Adw.ActionRow({ title: _('Plugins:') }))

            const script_folder = Gio.File.new_for_path(GLib.build_filenamev([GLib.get_home_dir(), '.config', 'wechsel', 'on-prj-create.d']));

            if (script_folder.query_exists(null)) {

                for (const script of script_folder.enumerate_children("%G_FILE_ATTRIBUTE_STANDARD_NAME", Gio.FileQueryInfoFlags.NONE, null)) {
                    const title = script.get_name()
                    const row = new Adw.ActionRow({ title: title });
                    group.add(row)
                    const toggle = new Gtk.Switch({
                        active: true,
                        valign: Gtk.Align.CENTER,
                    })
                    plugins.push([title, toggle])
                    row.add_suffix(toggle)
                }
            }
            return plugins
        }

        setupIcon(window) {
            let overlay = new Gtk.Overlay({
                halign: Gtk.Align.CENTER,
                valign: Gtk.Align.CENTER,
            });
            const row = new Adw.ActionRow({ title: _('Icon') });

            let iconBox = new Gtk.Box({
                orientation: Gtk.Orientation.VERTICAL
            });
            row.add_suffix(iconBox)
            iconBox.append(overlay)

            const fileDialog = new Gtk.FileDialog();
            this.iconLabel = new Gtk.Label({
                label: "",
                width_request: 64 * 2,
                height_request: 64 * 2,
            })
            const icon = new Gtk.Image({
                pixel_size: 64 * 2
            })

            overlay.add_css_class('bordered-image')

            const iconButton = new Gtk.Button({
                valign: Gtk.Align.END,
                halign: Gtk.Align.END,
                icon_name: "document-open",
            });
            iconButton.connect('clicked', () => {
                fileDialog.open(window, null, (dialog, res) => {
                    this.iconFile = dialog.open_finish(res)
                    icon.set_from_file(this.iconFile.get_path())
                    overlay.set_child(icon)
                });
            });

            overlay.add_overlay(iconButton);
            overlay.set_child(this.iconLabel);
            return row
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