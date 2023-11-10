// const { ExtensionUtils } = imports.misc.extensionUtils;
// const Me = ExtensionUtils.getCurrentExtension();
// const { getConfig } = Me.imports.util.utils;
import GLib from 'gi://GLib';
import Gtk from 'gi://Gtk';
import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import { getConfig } from './util/utils.js';

import {ExtensionPreferences, gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';


export default class ExamplePreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();
        const config = getConfig();
    
        // Create a preferences page, with a single group
        const new_prj_page = new Adw.PreferencesPage({
            title: _('New Project'),
            icon_name: 'document-new-symbolic', 
        });
        const settings_page = new Adw.PreferencesPage({
            title: _('Settings'),
            icon_name: 'preferences-system-symbolic',
        });
        const rm_prj_page = new Adw.PreferencesPage({
            title: _('Remove Project'),
            icon_name: 'edit-delete-symbolic',
        });
        window.add(settings_page);
        window.add(new_prj_page);
        window.add(rm_prj_page);
    
    
        // Settings Page
        const general_group = new Adw.PreferencesGroup();
        settings_page.add(general_group);
        
        let showIndicaterRow = new Adw.ActionRow({
            title: 'Show Indicator',
        });
    
        const toggle = new Gtk.Switch({
            active: settings.get_boolean('show-indicator'),
            valign: Gtk.Align.CENTER,
        });
        settings.bind('show-indicator', toggle, 'active', Gio.SettingsBindFlags.DEFAULT);
        showIndicaterRow.add_suffix(toggle);
        general_group.add(showIndicaterRow);
    
        // Add Project Page
        const add_prj_group = new Adw.PreferencesGroup();
        new_prj_page.add(add_prj_group);
    
        const model = new Gtk.StringList();
        const addItem = (prj) => {
            model.append(prj.name)
            for (const child of prj.children) {
                addItem(child);
            }
        }
        addItem(config.all_prjs);
    
        let parentRow = new Adw.ComboRow({
            title: 'Parent',
            model,
        });
        add_prj_group.add(parentRow);
    
        const entryRow = new Adw.ActionRow({ title: _('Name') });
        add_prj_group.add(entryRow);
    
        const name = new Gtk.Entry({
            placeholder_text: 'Project name',
        });
        entryRow.add_suffix(name);
    
        const folders = [];
        for (const folder of [["Music","folder-music"], ["Videos", "folder-videos"], 
                              ["Pictures", "folder-pictures"], ["Desktop","user-desktop"], 
                              ["Documents", "folder-documents"], ["Downloads", "folder-download"]]) {
            const row = new Adw.ActionRow({ title: folder[0] });
            add_prj_group.add(row);
            const toggle = new Gtk.Switch({
                active: ["Desktop", "Downloads"].includes(folder[0]),
                valign: Gtk.Align.CENTER,
            });
            folders.push([toggle, folder[0]]);
            row.add_suffix(toggle);
            const icon = new Gtk.Image({
                icon_name: ""+folder[1],
            });
            row.add_prefix(icon);
        }
        const createButton = new Gtk.Button({
            label: 'Add new',
            valign: Gtk.Align.CENTER,
            halign: Gtk.Align.END,
            cssClasses: ['raised'],
        });
        add_prj_group.add(createButton);
    
        createButton.connect('clicked', () => {
            GLib.spawn_command_line_sync(GLib.build_filenamev([GLib.get_home_dir(), ".local/bin", "change-prj "]) +
            "--new --parent "+ model.get_string(parentRow.get_selected())+
            ' --folders="'+ folders.filter((x) => x[0].active).map((x) => x[1]).join(" ")+ '" '+name.text);
    
            name.text = "";
            for (const folder of folders) {
                folder[0].active = ["Desktop", "Downloads"].includes(folder);
            }
            parentRow.set_selected(0);
            //TODO update UI
        });
    
        // Remove Project Page
        const rm_prj_group = new Adw.PreferencesGroup();
        rm_prj_page.add(rm_prj_group);
    
        const is_delete_row = new Adw.ActionRow({
            title: 'Delete / Remove Project',
        });
        const is_delete = new Gtk.Switch({
            active: false,
            valign: Gtk.Align.CENTER,
        });
    
        is_delete_row.add_suffix(is_delete);
        rm_prj_group.add(is_delete_row);
    
    
        const warning_remove = 'This will remove the current project and all its children from the config, but not delete any of the files!';
        const delete_warning = new Gtk.Label({
            label: warning_remove,
            halign: Gtk.Align.START,
            valign: Gtk.Align.CENTER,
        });
    
        rm_prj_group.add(delete_warning);
    
    
        is_delete.connect('notify::active', () => {
            removeButton.label = is_delete.active ? 'Delete Project' : 'Remove Project';
            delete_warning.label = is_delete.active ? 
                'Warning: This will delete the project and all its children! Both from the config and delete all the files / folders from the drive!' : warning_remove;
        });
    
        const removeButton = new Gtk.Button({
            label: 'Remove Project',
            valign: Gtk.Align.CENTER,
            halign: Gtk.Align.END,
            cssClasses: ['raised'],
        });
        rm_prj_group.add(removeButton);
    
        removeButton.connect('clicked', () => {
            const message = is_delete.active ?
            'Are you sure you want to delete the project and all its children?' :
            'Are you sure you want to remove the project and all its children from the config?';
    
            //  Create a dialog to confirm the action
            const dialog = new Gtk.AlertDialog({
                message: message,
                detail: 'This action cannot be undone!',
                // transient_for: window,
                modal: true,
                // destroy_with_parent: true,
                buttons: [
                        'Cancel',
                        'Confirm',
                ],
            });
    
            dialog.choose(window, null, (a,b) => {
                if (a.choose_finish(b) == 1) {
                    console.log("Deleting");
                            //     // GLib.spawn_command_line_sync(GLib.build_filenamev([GLib.get_home_dir(), ".local/bin", "change-prj "]) +
            //     // "--rm --parent "+ model.get_string(parentRow.get_selected())+
            //     // ' --folders="'+ folders.filter((x) => x[0].active).map((x) => x[1]).join(" ")+ '" '+name.text);
    
                }
            });
        });
        
        // Make sure the window doesn't outlive the settings object
        window._settings = settings;
    }
    
}


// const _ = ExtensionUtils.gettext;
// const GETTEXT_DOMAIN = 'my-indicator-extension';

// function init() {
//     ExtensionUtils.initTranslations(GETTEXT_DOMAIN);
// }

