// const { ExtensionUtils } = imports.misc.extensionUtils;
// const Me = ExtensionUtils.getCurrentExtension();
// const { getConfig } = Me.imports.util.utils;
import GLib from 'gi://GLib';
import Gtk from 'gi://Gtk';
import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import { getConfig } from './util/utils.js';

import {ExtensionPreferences, gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

import * as GeneralPrefs from './preferences/generalSettings.js';
import * as NewPrefs from './preferences/newProject.js';
import * as RemovePrefs from './preferences/removeProject.js';


const SettingsKey = {
    SHOW_INDICATOR: 'show-indicator',
    SWITCH_PROJECTS: 'switch-projects',
    SWITCH_PROJECTS_BACKWARD: 'switch-projects-backward',
};

export default class Preferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();
        const config = getConfig();
    
        // Create a preferences page, with a single group
        const generalPage = new GeneralPrefs.GeneralPage(settings, SettingsKey);
        const new_prj_page = new NewPrefs.NewPage(settings, SettingsKey, config);
        
        const rm_prj_page = new RemovePrefs.RemovePage(settings, SettingsKey);

        window.add(generalPage);
        window.add(new_prj_page);
        window.add(rm_prj_page);
        
        // Make sure the window doesn't outlive the settings object
        window._settings = settings;
    }
    
}


// const _ = ExtensionUtils.gettext;
// const GETTEXT_DOMAIN = 'my-indicator-extension';

// function init() {
//     ExtensionUtils.initTranslations(GETTEXT_DOMAIN);
// }

