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
import St from 'gi://St';
import Gio from 'gi://Gio';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import { callChangeProject, getIcons, getProjectTree } from './util/utils.js';

export class SearchProvider {
    constructor(extension) {
        this._extension = extension;


        // let app = Gio.AppInfo.create_from_commandline(
        //     "gnome-extensions prefs wechsel@transistor.local", // Command to launch your app
        //     "Wechsel",
        //     1//Gio.AppInfo.CreateFlags.SUPPORTS_STARTUP_NOTIFICATION
        // );

        // let app = Gio.AppInfo.get_default_for_uri_scheme('https');
        // // Fake the name and icon of the app
        // app.get_name = () => { return "Wechsel"; };
        // app.get_icon = () => Gio.icon_new_for_string("user-home-symbolic");
        // this.appInfo = app
        this.appInfo = {
            get_name: () => 'wechsel',
            get_id: () => "gnome-control-center",
            get_icon: () => Gio.icon_new_for_string("user-home-symbolic"),
            should_show: () => true,
            launch: () => {
                this.extension.openPreferences();
            },
        };

        this.canLaunchSearch = true;
        this.isRemoteProvider = false;

        this.projects = []
        getProjectTree.bind(this)(this._proc, (projects, _active) => {
            this.update_project_list(projects)
        }, Main.notifyError);

    }

    update_project_list(projects) {
        this.icons = getIcons(projects)
        this.projects = Array.from(this.icons.keys())
    }
    /**
     * The unique ID of the provider.
     *
     * Applications will return their application ID. Extensions will usually
     * return their UUID.
     *
     * @type {string}
     */
    get id() {
        return this._extension.uuid;
    }

    /**
     * Launch the search result.
     *
     * This method is called when a search provider result is activated.
     *
     * @param {string} result - The result identifier
     * @param {string[]} terms - The search terms
     */
    activateResult(result, _terms) {
        this._proc = callChangeProject(result);
    }

    /**
     * Launch the search provider.
     *
     * This method is called when a search provider is activated. A provider can
     * only be activated if the `appInfo` property holds a valid `Gio.AppInfo`
     * and the `canLaunchSearch` property is `true`.
     *
     * Applications will typically open a window to display more detailed or
     * complete results.
     *
     * @param {string[]} terms - The search terms
     */
    launchSearch(_terms) {
        this._extension.openPreferences();
    }

    /**
     * Create a result object.
     *
     * This method is called to create an actor to represent a search result.
     *
     * Implementations may return any `Clutter.Actor` to serve as the display
     * result, or `null` for the default implementation.
     *
     * @param {ResultMeta} meta - A result metadata object
     * @returns {Clutter.Actor|null} An actor for the result
     */
    createResultObject(_meta) {
        return null
    }



    /**
     * Get result metadata.
     *
     * This method is called to get a `ResultMeta` for each identifier.
     *
     * If @cancellable is triggered, this method should throw an error.
     *
     * @async
     * @param {string[]} results - The result identifiers
     * @param {Gio.Cancellable} cancellable - A cancellable for the operation
     * @returns {Promise<ResultMeta[]>} A list of result metadata objects
     */
    getResultMetas(results, cancellable) {
        // const scaleFactor = 1
        const { scaleFactor } = St.ThemeContext.get_for_stage(global.stage);//TODO

        return new Promise((resolve, reject) => {
            const cancelledId = cancellable.connect(
                () => reject(Error('Operation Cancelled')));

            const resultMetas = [];

            for (const identifier of results) {
                const meta = {
                    id: identifier,
                    name: identifier,
                    description: '',
                    clipboardText: identifier,
                    createIcon: size => {
                        const iconPath = this.icons?.get(identifier);
                        if (iconPath && iconPath.startsWith("/")) {
                            return new St.Icon({
                                gicon: Gio.icon_new_for_string(iconPath),
                                width: size * scaleFactor,
                                height: size * scaleFactor,
                            });
                        } else {
                            return new St.Icon({
                                icon_name: iconPath ? iconPath : 'folder-symbolic',
                                width: size * scaleFactor,
                                height: size * scaleFactor,
                            });
                        }
                    },
                };

                resultMetas.push(meta);
            }

            cancellable.disconnect(cancelledId);
            if (!cancellable.is_cancelled())
                resolve(resultMetas);
        });
    }

    /**
     * Initiate a new search.
     *
     * This method is called to start a new search and should return a list of
     * unique identifiers for the results.
     *
     * If @cancellable is triggered, this method should throw an error.
     *
     * @async
     * @param {string[]} terms - The search terms
     * @param {Gio.Cancellable} cancellable - A cancellable for the operation
     * @returns {Promise<string[]>} A list of result identifiers
     */
    getInitialResultSet(terms, cancellable) {
        return new Promise((resolve, reject) => {
            const cancelledId = cancellable.connect(
                () => reject(Error('Search Cancelled')));

            const projects = this.projects.filter((prj) => terms.some((term) => prj.includes(term)))

            cancellable.disconnect(cancelledId);
            if (!cancellable.is_cancelled())
                resolve(projects);
        });
    }

    /**
     * Refine the current search.
     *
     * This method is called to refine the current search results with
     * expanded terms and should return a subset of the original result set.
     *
     * Implementations may use this method to refine the search results more
     * efficiently than running a new search, or simply pass the terms to the
     * implementation of `getInitialResultSet()`.
     *
     * If @cancellable is triggered, this method should throw an error.
     *
     * @async
     * @param {string[]} results - The original result set
     * @param {string[]} terms - The search terms
     * @param {Gio.Cancellable} cancellable - A cancellable for the operation
     * @returns {Promise<string[]>}
     */
    getSubsearchResultSet(_results, terms, cancellable) {
        if (cancellable.is_cancelled())
            throw Error('Search Cancelled');

        return this.getInitialResultSet(terms, cancellable);
    }

    /**
     * Filter the current search.
     *
     * This method is called to truncate the number of search results.
     *
     * Implementations may use their own criteria for discarding results, or
     * simply return the first n-items.
     *
     * @param {string[]} results - The original result set
     * @param {number} maxResults - The maximum amount of results
     * @returns {string[]} The filtered results
     */
    filterResults(results, maxResults) {
        if (results.length <= maxResults)
            return results;

        return results.slice(0, maxResults);
    }

    destroy() {
        this._proc?.force_exit();
        this._proc = null;
    }
}