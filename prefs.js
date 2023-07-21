const ExtensionUtils = imports.misc.extensionUtils;

const Me = ExtensionUtils.getCurrentExtension();
const { getConfig } = Me.imports.util.utils;
const { Adw, Gio, Gtk, GLib } = imports.gi;

const _ = ExtensionUtils.gettext;
const GETTEXT_DOMAIN = 'my-indicator-extension';

function init() {
    ExtensionUtils.initTranslations(GETTEXT_DOMAIN);
}

function fillPreferencesWindow(window) {
    const settings = ExtensionUtils.getSettings();
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
    window.add(settings_page);
    window.add(new_prj_page);


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
    // showIndicaterRow.activatable_widget = toggle;
    general_group.add(showIndicaterRow);


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
    // comboRow.set_selected(keyBind);
    add_prj_group.add(parentRow);

    const entryRow = new Adw.ActionRow({ title: _('Name') });
    add_prj_group.add(entryRow);

    const name = new Gtk.Entry({
        placeholder_text: 'Project name',
    });
    entryRow.add_suffix(name);

    const folders = [];
    for (const folder of [["Music","folder-music"], ["Videos", "folder-videos"], 
                          ["Photos", "folder-pictures"], ["Desktop","user-desktop"], 
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

    });
    
    // Make sure the window doesn't outlive the settings object
    window._settings = settings;
}
