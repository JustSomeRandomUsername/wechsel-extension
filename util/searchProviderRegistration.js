/**
Wechsel

Copyright (C) 2024 GdH <G-dH@github.com>
Copyright (C) 2025 JustSomeRandomUsername

The following code is a derivative work of the code from the windows-search-provider project, 
which is licensed under GPLv3. In accordance with their copyright notice this code is therefore licensed under the terms 
of the GNU Public License, verison 3.

// https://github.com/eonpatapon/gnome-shell-extension-caffeine/blob/master/caffeine%40patapon.info/preferences/generalPage.js

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

import * as Main from 'resource:///org/gnome/shell/ui/main.js';

export function registerProvider(provider) {
    const searchResults = Main.overview.searchController._searchResults;
    provider.searchInProgress = false;

    // _providers is the source for default result selection, so it has to match the order of displays
    // insert WSP after app search but above all other providers
    let position = 1;
    searchResults._providers.splice(position, 0, provider);

    // create results display and add it to the _content
    searchResults._ensureProviderDisplay.bind(searchResults)(provider);

    // more important is to move the display up in the search view
    // displays are at stable positions and show up when their providers have content to display
    // another way to move our provider up below the applications provider is reloading remote providers
    // searchResults._reloadRemoteProviders()
    searchResults._content.remove_child(provider.display);
    searchResults._content.insert_child_at_index(provider.display, position);
}

export function unregisterProvider(provider) {
    const searchResults = Main.overview.searchController._searchResults;
    searchResults._unregisterProvider(provider);
}