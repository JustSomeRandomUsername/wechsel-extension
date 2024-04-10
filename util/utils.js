import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

let getConfig = function getConfig() {
    const config_file = Gio.File.new_for_path(GLib.build_filenamev([GLib.get_home_dir(), '.config/wechsel', 'wechsel_projects.json']));
    const [, contents, etag] = config_file.load_contents(null);
    const decoder = new TextDecoder('utf-8');
    const contentsString = decoder.decode(contents);
    return JSON.parse(contentsString);
}

export { getConfig }