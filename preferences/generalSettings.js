import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import GObject from 'gi://GObject';
import Gio from 'gi://Gio';

import { gettext as _ } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
import { ShortcutSettingWidget } from './shortcutWidget.js';

export var GeneralPage = GObject.registerClass(
class GeneralSettingsPage extends Adw.PreferencesPage {
    _init(settings, settingsKey) {
        super._init({
            title: _('General'),
            icon_name: 'preferences-system-symbolic',
            name: 'GeneralSettingsPage'
        });

        this._settings = settings;
        this._settingsKey = settingsKey;
    
        // Settings Page
        const general_group = new Adw.PreferencesGroup();
        this.add(general_group);
        
        let showIndicaterRow = new Adw.ActionRow({
            title: 'Show Indicator',
        });
    
        const toggle = new Gtk.Switch({
            active: settings.get_boolean('show-indicator'),
            valign: Gtk.Align.CENTER,
        });
        settings.bind(settingsKey.SHOW_INDICATOR, toggle, 'active', Gio.SettingsBindFlags.DEFAULT);
        showIndicaterRow.add_suffix(toggle);
        general_group.add(showIndicaterRow);


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
    }
});