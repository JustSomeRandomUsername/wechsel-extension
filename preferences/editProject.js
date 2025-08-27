import Adw from 'gi://Adw';
import GObject from 'gi://GObject';

import { gettext as _ } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
import { TextBlock } from '../util/gtk.js';

export const EditProjectPage = GObject.registerClass(
    class EditProjectPage extends Adw.PreferencesPage {
        constructor() {
            super({
                title: _('Edit Project'),
                icon_name: 'document-edit-symbolic',
                name: 'EditProjectPage'
            });

            this.add(new TextBlock('Projects', 'Wechsel projects are entirely stored and represented within the file system. Each project is a directory ending with the ".p" suffix. Child projects are located within their parent directory. The home project can be found at "~/home.p", containing all other projects. A shortcut can be found in the general settings page to open this directory. Wechsel does not include functionality to automatically rename or delete projects, as each such action directly interacts with your files and may cause data loss. Therefore all such actions have to be performed manually. But don\'t worry, it\'s both easy and intuitive :D'));
            this.add(new TextBlock('Folders', 'The directories wechsel switches are located within their respective project folder, ending with the suffix ".w". These directories will be symlinked into "~" when the project is selected. Wechsel will traverse the parent projects upwards, detecting inherited directories along the way.'));
            this.add(new TextBlock('Rename Project', 'To rename a project, simply change the name of its directory. Wechsel will automatically detect the new name and update its internal references. The extension may need to be restarted for the changes to take effect.'));
            this.add(new TextBlock('Delete Projects', 'To delete a project, remove its directory from the file system. Be cautious, as this action is irreversible and will permanently delete all contents within the project directory.'));
            this.add(new TextBlock('Add Wechsel Folder', 'To add a new wechsel folder to a project, simply create a new directory within the project directory, ensuring it ends with the ".w" suffix. Wechsel will automatically recognize and symlink this folder when the project is activated. The folder will also affect all child projects.'));
            this.add(new TextBlock('Delete Wechsel Folder', 'To remove a wechsel folder from a project, either delete the corresponding directory from the file system. Be aware that this action will permanently delete all contents within the wechsel folder! Alternatively, you can just remove the ".w" suffix from the directory name, converting it into a regular folder that will no longer be managed by Wechsel.'));
        }
    }
);