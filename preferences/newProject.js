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
import { HBoxGroup, ToggleRow, IconSelector, format_icon_label } from '../util/gtk.js';


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
            /** @type {Array<{name: string, toggle: Gtk.Switch}>} list of folder states */
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
            /** @type {HBoxGroup} Main group containing a single row which contains all elements */
            const header_group = new HBoxGroup();
            this.add(header_group);
            
            /** @type {IconSelector} The icon selector for the project */
            const icon = new IconSelector(this.window);
            header_group.append(icon);

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
            });
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
            header_group.append(right);

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
            const group = new Adw.PreferencesGroup({
                title: _('Directories'),
                description: _('These directories will be inherited from the parent project.'),
            });

            // TODO: Change defaults to be what the selected parent has 
            /** @type {Array<{name: string, toggle: Gtk.Switch}>} reference to folder states */
            const refs = [];
            for (const [title, icon_name] of Object.entries({
                Music: 'folder-music',
                Videos: 'folder-videos',
                Pictures: 'folder-pictures',
                Desktop: 'user-desktop',
                Documents: 'folder-documents',
                Downloads: 'folder-download',
            })) {
                const row = new ToggleRow({ title });
                row.add_prefix(new Gtk.Image({ icon_name }));
                group.add(row);
                refs.push({ name: title, toggle: row.toggle });
            }
            this.add(group);
            return refs;
        }

        /**
         * Adds a group with toggleable rows for each script in `~/.config/wechsel/on-prj-create.d`
         * @returns {Array<{name: string, toggle: Gtk.Switch}>} reference to plugin states
         */
        addPluginGroup() {
            /** @type {Adw.PreferencesGroup} Group for plugin toggles */
            const group = new Adw.PreferencesGroup({ 
                title: _('Plugins') 
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

            if (scripts.length > 0) {
                this.add(group);
            }
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
                    `--folders=${
                        this.folder_state
                            .filter((folder) => folder.toggle.active)
                            .map((folder) => folder.name)
                            .join(" ")
                    }`,
                ]);

                this._proc.communicate_utf8_async(null, null, (_subprocess, result /*@type {Gio.AsyncResult}*/, _data) => {
                    this._proc.communicate_utf8_finish(result);

                    const icon_file = this.header_state.icon.file;
                    if (icon_file) {
                        this._proc = Gio.Subprocess.new(
                            ["wechsel", "path", name],
                            Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE
                        );

                        this._proc.communicate_utf8_async(null, null, (_subprocess, result /*@type {Gio.AsyncResult}*/, _data) => {
                            this._proc.communicate_utf8_finish(result)
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
                for (const folder of this.folder_state) {
                    folder.toggle.active = true;
                }
                for (const plugin of this.plugin_state) {
                    plugin.toggle.active = true;
                }
                this.header_state.parent.set_selected(0);
            });

            this.add(group);
        }

        updateProjectList() {
            getProjectTree.bind(this)(this._proc, (projects) => {
                // clear the list
                this.header_state.projects = new Gtk.StringList();
                const addItem = (prj) => {
                    this.header_state.projects.append(prj.name)
                    for (const child of prj.children) {
                        addItem(child);
                    }
                }
                // recursively add all projects
                addItem(projects);
                // update the dropdown model
                this.header_state.parent.set_model(this.header_state.projects)
            });
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
