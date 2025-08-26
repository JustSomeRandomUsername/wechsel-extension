import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';

import { gettext as _ } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export const EditProjectPage = GObject.registerClass(
    class EditProjectPage extends Adw.PreferencesPage {
        constructor() {
            super({
                title: _('Edit Project'),
                icon_name: 'edit-symbolic',
                name: 'EditProjectPage'
            });

            const structure = new Adw.PreferencesGroup({
                title: _('Projects')
            });
            structure.add(new Gtk.Label({
                label: _('Wechsel projects are entirely stored and represented within the file system. Each project is a directory ending with the ".p" suffix. Child projects are located within their parent directory. The home project can be found at "~/home.p", containing all other projects. A shortcut can be found in the general settings page to open this directory. Wechsel does not include functionality to automatically rename or delete projects, as each such action directly interacts with your files and may cause data loss. Therefore all such actions have to be performed manually. But don\'t worry, it\'s both easy and intuitive :D'),
                wrap: true,
                justify: Gtk.Justification.FILL,
            }));
            
            const folders = new Adw.PreferencesGroup({
                title: _('Folders')
            });
            folders.add(new Gtk.Label({
                label: _('The directories wechsel switches are located within their respective project folder, ending with the suffix ".w". These directories will be symlinked into "~" when the project is selected. Wechsel will traverse the parent projects upwards, detecting inherited directories along the way.'),
                wrap: true,
                justify: Gtk.Justification.FILL,
            }));

            const rename = new Adw.PreferencesGroup({
                title: _('Rename Project')
            });
            rename.add(new Gtk.Label({
                label: _('To rename a project, simply change the name of its directory. Wechsel will automatically detect the new name and update its internal references. The extension may need to be restarted for the changes to take effect.'),
                wrap: true,
                justify: Gtk.Justification.FILL,
            }));

            const del = new Adw.PreferencesGroup({
                title: _('Delete Projects')
            });
            del.add(new Gtk.Label({
                label: _('To delete a project, remove its directory from the file system. Be cautious, as this action is irreversible and will permanently delete all contents within the project directory.'),
                wrap: true,
                justify: Gtk.Justification.FILL,
            }));

            const add_folder = new Adw.PreferencesGroup({
                title: _('Add Wechsel Folder')
            });
            add_folder.add(new Gtk.Label({
                label: _('To add a new wechsel folder to a project, simply create a new directory within the project directory, ensuring it ends with the ".w" suffix. Wechsel will automatically recognize and symlink this folder when the project is activated. The folder will also affect all child projects.'),
                wrap: true,
                justify: Gtk.Justification.FILL,
            }));

            const del_folder = new Adw.PreferencesGroup({
                title: _('Delete Wechsel Folder')
            });
            del_folder.add(new Gtk.Label({
                label: _('To remove a wechsel folder from a project, either delete the corresponding directory from the file system. Be aware that this action will permanently delete all contents within the wechsel folder! Alternatively, you can just remove the ".w" suffix from the directory name, converting it into a regular folder that will no longer be managed by Wechsel.'),
                wrap: true,
                justify: Gtk.Justification.FILL,
            }));

            this.add(structure);
            this.add(folders);
            this.add(rename);
            this.add(del);
            this.add(add_folder);
            this.add(del_folder);
        }
    }
);