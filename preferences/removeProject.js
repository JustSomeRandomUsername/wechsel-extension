import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import GObject from 'gi://GObject';
import Gio from 'gi://Gio';

import { gettext as _ } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export var RemovePage = GObject.registerClass(
class RemoveProjectPage extends Adw.PreferencesPage {
    _init(settings, settingsKey) {
        super._init({
            title: _('Remove Project'),
            icon_name: 'edit-delete-symbolic',
            name: 'RemoveProjectPage'
        });

        // Remove Project Page
        const rm_prj_group = new Adw.PreferencesGroup();
        this.add(rm_prj_group);
    
        const is_delete_row = new Adw.ActionRow({
            title: 'Remove Project',
        });
    
        const removeButton = new Gtk.Button({
            label: 'Remove Project',
            valign: Gtk.Align.CENTER,
            halign: Gtk.Align.END,
            cssClasses: ['raised'],
        });
        is_delete_row.add_suffix(removeButton);
        rm_prj_group.add(is_delete_row);


        const warning_remove = 'This will remove the current project and all its children from the config, but not delete any of the files';
        const remove_hint = new Gtk.Label({
            label: warning_remove,
            halign: Gtk.Align.START,
            valign: Gtk.Align.CENTER,
        });
        remove_hint.set_wrap(true);
    
        rm_prj_group.add(remove_hint);
    
        removeButton.connect('clicked', () => {
            const message = 'Are you sure you want to remove the project and all its children from the config?';
    
            //  Create a dialog to confirm the action
            const dialog = new Gtk.AlertDialog({
                message: message,
                detail: 'Removing a project will remove it and all its children from the config, but not delete any of the files.',
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
    }
});