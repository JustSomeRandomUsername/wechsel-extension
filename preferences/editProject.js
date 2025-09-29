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

            this.add(new TextBlock('Projects', 'Wechsel projects are entirely stored and represented within the file system. Each project is a directory ending with the ".p" suffix. Child projects are located within their parent directory. The root project is either you home directory "~/" or the directory "~/home.p", containing all other projects. A shortcut can be found in the general settings page to open this directory. Wechsel does not include functionality to automatically rename or delete projects, as each such action directly interacts with your files and may cause data loss. Therefore all such actions have to be performed manually. But don\'t worry, it\'s both easy and intuitive :D'));
            this.add(new TextBlock('Folders', 'The directories wechsel switches are located within their respective project directory, ending with the suffix ".w". These directories will be symlinked into "~" when the project is selected. Wechsel will traverse the parent projects upwards, detecting inherited directories along the way.'));
            this.add(new TextBlock('Rename Project', 'To rename a project, simply change the name of its directory. Wechsel will automatically detect the new name and update its internal references. If the extension does not update itself automatically, it should do so when you open the indicator once.'));
            this.add(new TextBlock('Delete Projects', 'To delete a project, either move its directory "{project_name}.p" outside of a wechsel project folder, remove the ".p" from its name or delete its directory.'));
            this.add(new TextBlock('Add Wechsel Folder', 'To add a new wechsel directory to a project, create a new directory within the project directory, ensuring it ends with the ".w" suffix. Wechsel will automatically recognize and symlink this directory when the project is activated or a child project that does not contain a directory with that name.'));
            this.add(new TextBlock('Delete Wechsel Folder', 'To remove a wechsel directory from a project, either delete the corresponding directory "{folder_name}.w" from the file system.  Alternatively, you can just remove the ".w" suffix from the directory name, converting it into a regular directory that will no longer be managed by Wechsel.'));
        }
    }
);