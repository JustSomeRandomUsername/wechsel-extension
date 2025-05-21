/**
Wechsel
Copyright (C) 2024 JustSomeRandomUsername

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.

SPDX-License_identifier: GPL-3.0-or-later
*/

import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

/**
 * @typedef {Object} Config
 * @property {string} active
 * @property {string} base_folder
*/

/**
 * @typedef {Object} ProjectTree
 * @property {string} name
 * @property {ProjectTree[]} children
 * @property {string} path
*/

/**
 * 
 * @param {*} proc 
 * @param {function(ProjectTree, string): void} lambda 
 */
export function getProjectTree(proc, lambda) {
    try {
        proc = Gio.Subprocess.new(
            ["wechsel",
                'tree',
            ],
            Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE
        );
    } catch {
        return
    }
    proc.communicate_utf8_async(null, null, (subprocess /*@type {Gio.Subprocess}*/, result /*@type {Gio.AsyncResult}*/, _data) => {
        const [success, stdout, stderr] = proc.communicate_utf8_finish(result)
        if (stderr !== "") {
            Main.notifyError('An error occurred while getting the project tree', stderr);
        }
        if (success) {
            let data
            try {
                data = JSON.parse(stdout)
            } catch { return }
            lambda(data.tree, data.active)
        }
    });
}

/**
 * @param {string} basePath - path to the base project folder
 * @param {string[]} extensions - extension to search for
 * @return {string | undefined}
 */
function createIconWithFallback(basePath, file_stem, extensions = ['txt', 'svg', 'png', 'jpg', 'jpeg', 'gif']) {
    for (let ext of extensions) {
        for (let i = 0; i < 2; i++) {
            let filePath = `${basePath}/${i == 1 ? "." : ""}${file_stem}.${ext}`;
            let file = Gio.File.new_for_path(filePath);

            if (file.query_exists(null)) {
                if (ext === 'txt') {
                    const [, contents, _etag] = file.load_contents(null);
                    const decoder = new TextDecoder('utf-8');
                    return decoder.decode(contents).trim();
                }
                return filePath
            }
        }
    }
    return undefined
}

/**
 * 
 * @param {ProjectTree} project_tree 
 * @param {Config} config 
 * @returns {Map<string, string>}
 */
export function getIcons(project_tree) {
    /**@type {Map<string, string>} */
    let result = new Map()

    /** @type {function(ProjectTree, string)} */
    let recurse = (project) => {
        result.set(project.name, createIconWithFallback(project.path, "icon"))
        for (const child of project.children) {
            recurse(child)
        }
    }

    recurse(project_tree)
    return result
}
/**
 * 
 * @param {string} project 
 */
export function callChangeProject(project) {
    return Gio.Subprocess.new(
        ["wechsel", "change", project],
        Gio.SubprocessFlags.NONE
    );
}

/**
 * 
 * @param {*} proc 
 * @returns {boolean}
 */
export function checkInstallation(proc) {
    // Check if Wechsel is installed
    let good_version = true
    try {
        proc = Gio.Subprocess.new(
            ["wechsel", "--version"],
            Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE,
        );
        const [_success, stdout, stderr] = proc.communicate_utf8(null, null);

        if (!stdout || stdout.match(/.*\d+.2.\d+/) === null) {
            good_version = false
        }

    } catch {
        Main.notifyError('An error occurred while checking the wechsel version', stderr);
        return false
    };

    if (!good_version) {
        Main.notifyError('An error occurred while checking the wechsel version', stderr);
        return false
    }
    return true
}
