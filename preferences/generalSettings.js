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
import { ShortcutSettingWidget } from './shortcutWidget.js';

export const GeneralPage = GObject.registerClass(
    class GeneralSettingsPage extends Adw.PreferencesPage {
        constructor(settings, settingsKey) {
            super({
                title: _('General'),
                icon_name: 'preferences-system-symbolic',
                name: 'GeneralSettingsPage'
            });

            this._settings = settings;
            this._settingsKey = settingsKey;

            // Settings Page
            const general_group = new Adw.PreferencesGroup();
            this.add(general_group);

            // Show Indicator
            let showIndicaterRow = new Adw.ActionRow({
                title: 'Show Indicator',
            });

            const toggle = new Gtk.Switch({
                active: settings.get_boolean(settingsKey.SHOW_INDICATOR),
                valign: Gtk.Align.CENTER,
            });
            settings.bind(settingsKey.SHOW_INDICATOR, toggle, 'active', Gio.SettingsBindFlags.DEFAULT);
            showIndicaterRow.add_suffix(toggle);
            general_group.add(showIndicaterRow);

            // OverViewSearch
            let OverViewSearchRow = new Adw.ActionRow({
                title: 'Show Projects in Overview Search',
                subtitle: 'Will apply at next login'
            });

            const OverViewSearchToggle = new Gtk.Switch({
                active: settings.get_boolean(settingsKey.SEARCH_PROVIDER),
                valign: Gtk.Align.CENTER,
            });
            settings.bind(settingsKey.SEARCH_PROVIDER, OverViewSearchToggle, 'active', Gio.SettingsBindFlags.DEFAULT);
            OverViewSearchRow.add_suffix(OverViewSearchToggle);
            general_group.add(OverViewSearchRow);

            const openProjectFolder = new Adw.ActionRow({
                title: 'Open Project Folder in File Manager',
            });


            // Shortcut group
            // --------------
            let shortcutGroup = new Adw.PreferencesGroup({
                title: _('Switch Projects'),
            });

            this.shortcutKeyBoard = new ShortcutSettingWidget(
                this._settings,
                this._settingsKey.SWITCH_PROJECTS,
                _('Switch Forward'),
                _('')
            );
            this.backwardsSortcutKeyBoard = new ShortcutSettingWidget(
                this._settings,
                this._settingsKey.SWITCH_PROJECTS_BACKWARD,
                _('Switch Backwards'),
                _('')
            );

            // Add elements
            shortcutGroup.add(this.backwardsSortcutKeyBoard);
            shortcutGroup.add(this.shortcutKeyBoard);

            this.add(shortcutGroup);


            // Open Project Folder 
            let buttonGroup = new Adw.PreferencesGroup({
                title: '',
            });
            const openButton = new Gtk.Button({
                label: 'Open',
                valign: Gtk.Align.CENTER,
                halign: Gtk.Align.END,
                cssClasses: ['raised'],
            });
            openProjectFolder.add_suffix(openButton);
            openButton.connect('clicked', () => {

                getProjectTree(this._proc, (projects, active) => {
                    let recurse = (project) => {
                        if (project.name == active) {
                            return project
                        }
                        for (const child of project.children) {
                            let prj = recurse(child)
                            if (prj !== null) {
                                return prj
                            }
                        }
                        return null
                    }

                    let prj = recurse(projects)

                    const folder = `file://${prj.path}`;
                    Gio.AppInfo.launch_default_for_uri(folder, null);
                });
                // this._proc = Gio.Subprocess.new(
                //     ["wechsel", "path", "$(wechsel active)"],//TODO Test
                //     Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE
                // );

                // this._proc.communicate_utf8_async(null, null, (subprocess /*@type {Gio.Subprocess}*/, result /*@type {Gio.AsyncResult}*/, _data) => {
                //     const [_success, stdout, stderr] = this._proc.communicate_utf8_finish(result)
                //     if (stderr !== "") {
                //         Main.notifyError('An error occured', stderr);
                //     }
                //     if (stdout !== "") {
                //         const folder = `file://${stdout.trim()}`;
                //         Gio.AppInfo.launch_default_for_uri(folder, null);
                //     }
                // });
            });
            buttonGroup.add(openProjectFolder)
            this.add(buttonGroup);

        }

        destroy() {
            this._proc.force_exit();
            this._proc = null;
            super.destroy();
        }
    });