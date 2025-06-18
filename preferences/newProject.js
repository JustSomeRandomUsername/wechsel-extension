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
import Gdk from 'gi://Gdk';
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
            const customGroup = new Adw.PreferencesGroup();
            this.add(customGroup);
            const customRow = new Gtk.ListBoxRow();
            customGroup.add(customRow);
            customRow.add_css_class('no-hover');
            const hbox = new Gtk.Box({
                orientation: Gtk.Orientation.HORIZONTAL,
                spacing: 12,
                valign: Gtk.Align.CENTER,
            });
            customRow.set_child(hbox);

            // Icon
            hbox.append(this.setupIcon(window))
            const right = new Gtk.Box({
                orientation: Gtk.Orientation.HORIZONTAL,
                height_request: 40,
                spacing: 6,
                valign: Gtk.Align.CENTER,
                halign: Gtk.Align.START,
            });
            hbox.append(right);

            // Setup List of All Project Names 
            this.name_list = new Gtk.StringList();

            // Parent Selector 
            this.parentWidget = new Gtk.DropDown({
                model: this.name_list,
            });
            right.append(this.parentWidget);

            // Text
            right.append(new Gtk.Label({
                label: _('/'),
            }));

            // Name Entry
            const name_input = new Gtk.Entry({
                placeholder_text: 'Project name',
            });
            right.append(name_input);
            // Update Icon Label in case the icon file is not set
            name_input.connect('changed', (entry) => {
                if (!this.iconFile) {
                    this.iconLabel.set_markup_with_mnemonic(`<span font="42">${entry.text.substring(0, 3)}</span>`)
                }
            })

            const folderGroup = new Adw.PreferencesGroup({
                title: _('Directories'),
                description: _('These directories will be inherited from the parent project.'),
            });
            this.add(folderGroup);
            // Folder Toggles
            const folders = [];
            // TODO Change defaults to be what the selected parent has 
            for (const folder of [["Music", "folder-music"], ["Videos", "folder-videos"],
            ["Pictures", "folder-pictures"], ["Desktop", "user-desktop"],
            ["Documents", "folder-documents"], ["Downloads", "folder-download"]]) {
                const row = new Adw.ActionRow({ title: folder[0] });
                folderGroup.add(row);
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

            const pluginGroup = new Adw.PreferencesGroup({ 
                title: _('Plugins') 
            });
            this.add(pluginGroup);
            const plugins = this.setupPlugins(pluginGroup);

            const bottomGroup = new Adw.PreferencesGroup();
            this.add(bottomGroup);
            // Create Button
            const createButton = new Gtk.Button({
                label: 'Create',
                valign: Gtk.Align.CENTER,
                halign: Gtk.Align.END,
                cssClasses: ['raised'],
            });
            bottomGroup.add(createButton);

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
                    '--parent', this.name_list.get_string(this.parentWidget.get_selected()),
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
                this.parentWidget.set_selected(0);
            });

            this.connect('map', () => {
                this.updateProjectList();
            });
        }

        setupPlugins(group) {
            const script_folder = Gio.File.new_for_path(GLib.build_filenamev([GLib.get_home_dir(), '.config', 'wechsel', 'on-prj-create.d']));

            if (!script_folder.query_exists(null)) {
                return [];
            }
            const scripts = [...script_folder.enumerate_children("%G_FILE_ATTRIBUTE_STANDARD_NAME", Gio.FileQueryInfoFlags.NONE, null)];
            if (scripts.length === 0) {
                return [];
            }

            const plugins = []

            for (const script of scripts) {
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
            
            return plugins
        }

        setupIcon(window) {
            const size = 128; // Size of the icon in pixels

            // Add a CSS provider
            const cssProvider = new Gtk.CssProvider();
            cssProvider.load_from_data(`
                .bordered-image {
                    border: 1px solid white;
                    border-radius: 8px;
                    max-width: ${size}px;
                    max-height: ${size}px;
                }

                .inset {
                    margin: 4px;
                }

                .no-hover:hover {
                    background-color: transparent;
                    box-shadow: none;
                }
            `, -1);

            Gtk.StyleContext.add_provider_for_display(
                Gdk.Display.get_default(),
                cssProvider,
                Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION
            );

            // Create overlay
            let overlay = new Gtk.Overlay({
                halign: Gtk.Align.CENTER,
                valign: Gtk.Align.CENTER,
            });
            overlay.add_css_class('bordered-image');

            // preview label for icon
            this.iconLabel = new Gtk.Label({
                label: "",
                width_request: size,
                height_request: size,  // smaller height for label only
                halign: Gtk.Align.CENTER,
                hexpand: false,
            });

            // Image widget
            const icon = new Gtk.Image({
                pixel_size: size,
            });
            icon.set_can_focus(false);
            icon.set_focus_on_click(false);
            icon.set_sensitive(false);

            // Stack for toggling image / label preview
            const stack = new Gtk.Stack({
                halign: Gtk.Align.CENTER,
                valign: Gtk.Align.CENTER,
                width_request: size,
                height_request: size,
            });
            stack.add_named(this.iconLabel, 'label');
            stack.add_named(icon, 'image');
            stack.set_visible_child_name('label');  // default to label
            overlay.set_child(stack);

            // File picker button
            const iconButton = new Gtk.Button({
                icon_name: "document-open",
                valign: Gtk.Align.START,
                halign: Gtk.Align.END,
            });
            iconButton.add_css_class('inset');
            iconButton.set_tooltip_text(_('Select an image for the project'));
            overlay.add_overlay(iconButton);

            // File dialog connection
            const fileDialog = new Gtk.FileDialog();
            iconButton.connect('clicked', () => {
                fileDialog.open(window, null, (dialog, res) => {
                    this.iconFile = dialog.open_finish(res);
                    if (this.iconFile) {
                        icon.set_from_file(this.iconFile.get_path());
                        stack.set_visible_child_name('image');  // show image
                    } else {
                        stack.set_visible_child_name('label');  // fallback to label
                    }
                });
            });

            return overlay;
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

                this.parentWidget.set_model(this.name_list)
            });
        }

        destroy() {
            this._proc.force_exit();
            this._proc = null;
            this.name_list = null;
            super.destroy();
        }
    }
);