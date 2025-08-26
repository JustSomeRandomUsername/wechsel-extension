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
import { ToggleRow, IconSelector, format_icon_label, ToggleBox } from '../util/gtk.js';


import { gettext as _ } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export const NewProjectPage = GObject.registerClass(
    class NewProjectPage extends Adw.PreferencesPage {
        constructor(window) {
            super({
                title: _('New Project'),
                icon_name: 'document-new-symbolic',
                name: 'NewProjectPage'
            });

            this.window = window;

            /** @type {{projects: Gtk.StringList, parent: Gtk.DropDown, name: Gtk.Entry, icon: IconSelector}} references to the main selection elements */
            this.header_state = this.addHeaderGroup();
            /** @type {Array<{name: string, toggle: Gtk.Switch, row: number}>} list of folder states */
            this.folder_state = this.addFolderGroup();
            /** @type {Array<{name: string, toggle: Gtk.Switch}>} list of plugin states */
            this.plugin_state = this.addPluginGroup();

            this.addCreateButton();

            this.connect('map', () => {
                this.updateProjectList();
            });
        }

        /**
         * Adds the main selection elements for the new project
         * (parent, name, icon)
         * @returns {{
         *  projects: Gtk.StringList,
         *  parent: Gtk.DropDown,
         *  name: Gtk.Entry,
         *  icon: IconSelector
         * }} references to the created elements
         */
        addHeaderGroup() {
            /** @type {Adw.PreferencesGroup} Main group containing a single row which contains all elements */
            const group = new Adw.PreferencesGroup();
            this.add(group);

            const row = new Gtk.ListBoxRow();
            row.add_css_class('no-hover');
            group.add(row);
            // TODO

            /** @type {Gtk.Box} A horizontal wrapper box to wrap the elements, as a row can only have a single child */
            const outer_box = new Gtk.Box({
                orientation: Gtk.Orientation.HORIZONTAL,
                spacing: 12,
                valign: Gtk.Align.CENTER,
            });
            row.set_child(outer_box);
            // const group = new HBoxGroup();


            /** @type {IconSelector} The icon selector for the project */
            const icon = new IconSelector(this.window);
            outer_box.append(icon);

            /** @type {Gtk.Box} Right side box containing the parent selector and name entry. Wrapped in a box to ensure proper spacing. */
            const right = new Gtk.Box({
                orientation: Gtk.Orientation.HORIZONTAL,
                height_request: 40,
                spacing: 6,
                valign: Gtk.Align.CENTER,
                halign: Gtk.Align.START,
            });
            /** @type {Gtk.StringList} A list of project names for reference in the parent selection dropdown*/
            const projects = new Gtk.StringList();
            /** @type {Gtk.DropDown} A dropdown for selecting the parent project */
            const parent = new Gtk.DropDown({
                model: projects,
                tooltip_text: "Parent Project",
            });
            parent.connect("notify::selected", () => this.updateFolderToggles())
            right.append(parent);

            // Separator
            right.append(new Gtk.Label({
                label: _('/'),
            }));

            /** @type {Gtk.Entry} An entry for the project name */
            const name = new Gtk.Entry({
                placeholder_text: 'Project Name',
            });

            // Update Icon Label in case the icon file is not set
            name.connect('changed', (entry) => {
                if (icon.file) return;
                icon.label.set_markup_with_mnemonic(format_icon_label(entry.text.substring(0, 3)))
            })
            right.append(name);
            outer_box.append(right);

            return {
                projects,
                parent,
                name,
                icon,
            };
        }

        /**
         * Adds a group with toggleable rows for each standard folder
         * @returns {Array<{name: string, toggle: Gtk.Switch}>} reference to folder states
         */
        addFolderGroup() {
            /** @type {Adw.PreferencesGroup} Group for folder toggles */
            this.folderGroup = new Adw.PreferencesGroup({
                title: _('Directories'),
                description: _('These directories will be inherited from the parent project.'),
            });

            this.grid = new Gtk.Grid({
                column_spacing: 12,
                row_spacing: 6,
                column_homogeneous: true,
            });

            const rowWrapper = new Gtk.ListBoxRow({
                cssClasses: ["card", "folderRow"]
            });
            rowWrapper.set_child(this.grid);
            rowWrapper.set_activatable(false);  // Don’t highlight row on click
            this.folderGroup.add(rowWrapper);

            this.add(this.folderGroup);
            return [];
        }

        /**
         * Adds a group with toggleable rows for each script in `~/.config/wechsel/on-prj-create.d`
         * @returns {Array<{name: string, toggle: Gtk.Switch}>} reference to plugin states
         */
        addPluginGroup() {
            /** @type {Adw.PreferencesGroup} Group for plugin toggles */
            const group = new Adw.PreferencesGroup({
                title: _('Plugins'),
                description: _('script in the on-prj-create.d of your wechsel config directory')
            });

            /** @type {Gio.File} directory containing the scripts */
            const script_folder = Gio.File.new_for_path(GLib.build_filenamev([GLib.get_home_dir(), '.config', 'wechsel', 'on-prj-create.d']));

            if (!script_folder.query_exists(null)) return [];

            /** @type {Array<Gio.File>} Array of script files */
            const scripts = [...script_folder.enumerate_children("%G_FILE_ATTRIBUTE_STANDARD_NAME", Gio.FileQueryInfoFlags.NONE, null)];

            /** @type {Array<{name: string, toggle: Gtk.Switch}>} reference to plugin states */
            const plugins = [];
            for (const script of scripts) {
                const row = new ToggleRow({
                    title: script.get_name()
                });
                group.add(row);
                plugins.push({ name: script.get_name(), toggle: row.toggle });
            }

            this.add(group);
            return plugins;
        }

        addCreateButton() {
            const group = new Adw.PreferencesGroup();
            /** @type {Gtk.Button} The create button */
            const button = new Gtk.Button({
                label: 'Create',
                valign: Gtk.Align.CENTER,
                halign: Gtk.Align.END,
                cssClasses: ['raised'],
            });
            group.add(button);

            button.connect('clicked', () => {
                /** @type {string} The project name */
                const name = this.header_state.name.text;
                if (name === "") return;

                /** @type {Gio.SubprocessLauncher} Launcher for the subprocess */
                const launcher = new Gio.SubprocessLauncher({
                    flags: Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE,
                });

                /** @type {string} The plugin environment variable */
                const plugin_env = this.plugin_state
                    .filter((plugin) => plugin.toggle.active)
                    .map((plugin) => plugin.name)
                    .join(";");

                // set the PLUGINS environment variable for wechsel backend
                launcher.setenv("PLUGINS", plugin_env, true);

                // Call `wechsel new <name> --parent <selected_parent> --folders=<folder_states>`
                this._proc = launcher.spawnv(["wechsel",
                    'new',
                    name,
                    '--parent', this.header_state.projects.get_string(this.header_state.parent.get_selected()),
                    `--folders=${this.folder_state
                        .filter((folder) => folder.toggle.active)
                        .map((folder) => folder.name)
                        .join(" ")
                    }`,
                ]);

                this._proc.communicate_utf8_async(null, null, (_subprocess, result /*@type {Gio.AsyncResult}*/, _data) => {
                    const [_success, stdout, stderr] = this._proc.communicate_utf8_finish(result);
                    if (stderr !== "") {
                        console.log('An error occurred while adding the project', stderr);
                    }
                    const icon_file = this.header_state.icon.file;
                    if (icon_file) {
                        this._proc = Gio.Subprocess.new(
                            ["wechsel", "path", name],
                            Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE
                        );

                        this._proc.communicate_utf8_async(null, null, (_subprocess, result /*@type {Gio.AsyncResult}*/, _data) => {
                            const [_success, stdout, stderr] = this._proc.communicate_utf8_finish(result)
                            if (stderr !== "") {
                                console.log('An error occurred while adding the project', stderr);
                            }
                            if (stdout == "") return;

                            let suffix = icon_file.get_basename().split('.')
                            if (suffix.length <= 1) return;

                            let target = Gio.File.new_for_path(`${stdout.trim()}/icon.${suffix.pop()}`)
                            icon_file.copy(target, Gio.FileQueryInfoFlags.NONE, null, null)

                            const folder = `file://${stdout.trim()}`;
                            Gio.AppInfo.launch_default_for_uri(folder, null);
                        });
                    }

                    this.updateProjectList();
                });

                // Reset the form
                this.header_state.icon.file = null;
                this.header_state.icon.label.set_markup_with_mnemonic(format_icon_label(''));
                this.header_state.name.text = "";
                // for (const folder of this.folder_state) {
                //     folder.toggle.active = true;
                // }
                for (const plugin of this.plugin_state) {
                    plugin.toggle.active = true;
                }
                this.header_state.parent.set_selected(0);
            });

            this.add(group);
        }

        /** Updates the Toggles in the Folder widget according to the selected parent project  */
        updateFolderToggles() {
            if (!this.folderMap) {
                return;
            }
            let parent_folders = this.folderMap[this.header_state.projects.get_string([this.header_state.parent.get_selected()])];
            if (!parent_folders) {
                return;
            }
            for (let folder of this.folder_state) {
                folder.toggle.active = parent_folders.includes(folder[1]);
            }
        }

        updateProjectList() {
            getProjectTree.bind(this)(this._proc, (projects, active) => {
                // clear the list
                this.header_state.projects = new Gtk.StringList();
                let folder_names = new Set();

                let active_index = 0;
                this.folderMap = {};
                const addItem = (prj) => {
                    this.header_state.projects.append(prj.name)
                    console.log(prj);
                    prj.folders.forEach(folder => {
                        folder_names.add(folder);
                    });
                    this.folderMap[prj.name] = prj.folders;
                    if (active === prj.name) {
                        active_index = this.header_state.projects.n_items - 1;
                    }
                    for (const child of prj.children) {
                        addItem(child);
                    }
                }

                // recursively add all projects
                addItem(projects);

                // update the dropdown model
                this.header_state.parent.set_model(this.header_state.projects);
                this.header_state.parent.set_selected(active_index);


                // Clear the folder list
                for (let folder of this.folder_state) {
                    this.folderGroup.remove(folder.row);
                }
                // Setup the folder List 
                this.folder_state = [];
                let i = 0;
                for (let folder of folder_names) {
                    let box = new ToggleBox(folder);

                    const row = Math.floor(i / 2);

                    this.folder_state.push({ toggle: box.toggle, name: folder, row: row });

                    this.grid.attach(box, i % 2, row, 1, 1);
                    i++;
                }

                this.updateFolderToggles();
            }, {}, true);
        }

        destroy() {
            this._proc.force_exit();
            this._proc = null;
            this.header_state = null;
            this.folder_state = null;
            this.plugin_state = null;
            this.window = null;
            super.destroy();
        }
    }
);
