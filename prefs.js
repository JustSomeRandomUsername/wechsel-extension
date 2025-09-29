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

import { ExtensionPreferences, gettext as _ } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

import * as GeneralPrefs from './preferences/generalSettings.js';
import * as NewPrefs from './preferences/newProject.js';
import * as EditPrefs from './preferences/editProject.js';


const SettingsKey = {
    SHOW_INDICATOR: 'show-indicator',
    SEARCH_PROVIDER: 'activate-search-provider',
    SWITCH_PROJECTS: 'switch-projects',
    SWITCH_PROJECTS_BACKWARD: 'switch-projects-backward',
};

export default class Preferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();

        const generalPage = new GeneralPrefs.GeneralPage(settings, SettingsKey);
        const new_prj_page = new NewPrefs.NewProjectPage(window);
        const edit_prj_page = new EditPrefs.EditProjectPage();

        window.add(generalPage);
        window.add(new_prj_page);
        window.add(edit_prj_page);

        // Make sure the window doesn't outlive the settings object
        window._settings = settings;
    }

}

