
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

import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import Gdk from 'gi://Gdk';
import Gio from 'gi://Gio';
import GObject from 'gi://GObject';

import { gettext as _ } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export const ToggleRow = GObject.registerClass(class ToggleRow extends Adw.ActionRow {
    constructor(args) {
        super(args);
        /**
         * Reference to the suffix toggle switch
         * @type {Gtk.Switch}
         */
        this.toggle = new Gtk.Switch({
            active: args.active | true,
            valign: Gtk.Align.CENTER,
        });
        this.add_suffix(this.toggle);
    }

    destroy() {
        this.toggle = null;
        super.destroy();
    }
});

export const ToggleBox = GObject.registerClass(class ToggleBox extends Gtk.Box {
    constructor(label, args) {
        super({ ...args, orientation: Gtk.Orientation.HORIZONTAL });
        this.toggle = new Gtk.Switch({
            valign: Gtk.Align.CENTER,
        });

        this.append(new Gtk.Label({ label }));
        this.append(new Gtk.Box({ hexpand: true }))
        this.append(this.toggle);
    }

    destroy() {
        this.toggle = null;
        super.destroy();
    }
});

export const IconSelector = GObject.registerClass(class IconSelector extends Gtk.Overlay {
    /**
     * @param {number} size Size of the icon preview in pixels (default: 128)
     */
    constructor(
        window,
        size = 128,
        args
    ) {
        super({
            ...args,
            halign: Gtk.Align.CENTER,
            valign: Gtk.Align.CENTER,
            tooltip_text: "Project Icon",
            cssClasses: ['card'],
        });

        /** @type {Gio.File} Currently selected icon file */
        this.file = null;
        /** @type {Gtk.Label} Label shown when no icon file is selected */
        this.label = new Gtk.Label({
            label: "",
            width_request: size,
            height_request: size,
            halign: Gtk.Align.CENTER,
            hexpand: false,
            overflow: Gtk.Overflow.HIDDEN,
        });

        // Add a CSS provider
        const cssProvider = new Gtk.CssProvider();
        cssProvider.load_from_data(`
            .inset {
                margin: 4px;
            }

            .no-hover:hover {
                background-color: transparent;
                box-shadow: none;
            }
            .folderRow {
                padding: 15px;
            }
        `, -1);

        Gtk.StyleContext.add_provider_for_display(
            Gdk.Display.get_default(),
            cssProvider,
            Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION
        );
        // this.add_css_class('bordered-image');

        /** @type {Gtk.Image} Icon preview image */
        const icon = new Gtk.Image({
            pixel_size: size,
        });
        icon.set_can_focus(false);
        icon.set_focus_on_click(false);
        icon.set_sensitive(false);

        /** @type {Gtk.Stack} Stack for toggling image / label preview */
        const stack = new Gtk.Stack({
            halign: Gtk.Align.CENTER,
            valign: Gtk.Align.CENTER,
            width_request: size,
            height_request: size,
        });
        stack.add_named(this.label, 'label');
        stack.add_named(icon, 'image');
        stack.set_visible_child_name('label');  // default to label
        this.set_child(stack);

        /** @type {Gtk.Button} file picker button */
        const filePickerBtn = new Gtk.Button({
            icon_name: "document-open",
            valign: Gtk.Align.START,
            halign: Gtk.Align.END,
            cssClasses: ['inset'],
            tooltip_text: _('Select an icon for the project')
        });
        this.add_overlay(filePickerBtn);

        /** @type {Gtk.FileDialog} File dialog for picking an icon */
        const fileDialog = new Gtk.FileDialog();
        filePickerBtn.connect('clicked', () => {
            fileDialog.open(window, null, (dialog, res) => {
                this.file = dialog.open_finish(res);
                if (this.file) {
                    icon.set_from_file(this.file.get_path());
                    stack.set_visible_child_name('image');  // show image
                } else {
                    stack.set_visible_child_name('label');  // fallback to label
                }
            });
        });
    }

    destroy() {
        this.file = null;
        this.label = null;
        super.destroy();
    }
});

export function format_icon_label(msg) {
    return `<span font="42">${msg}</span>`;
}