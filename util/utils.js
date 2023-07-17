const {Gio, GLib} = imports.gi;

function getConfig() {
    const config_file = Gio.File.new_for_path(GLib.build_filenamev([GLib.get_home_dir(), '.config', 'prj-settings.json']));
    const [, contents, etag] = config_file.load_contents(null);
    const config = JSON.parse(contents);
    return config;
}