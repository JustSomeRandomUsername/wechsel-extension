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
import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';
import Gdk from 'gi://Gdk';

import { gettext as _ } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

const genParam = (type, name, ...dflt) => GObject.ParamSpec[type](name, name, name, GObject.ParamFlags.READWRITE, ...dflt);

/*
* Shortcut Widget
*/
export const ShortcutSettingWidget = class extends Adw.ActionRow {
    static {
        GObject.registerClass({
            Properties: {
                shortcut: genParam('string', 'shortcut', '')
            },
            Signals: {
                changed: { param_types: [GObject.TYPE_STRING] }
            }
        }, this);
    }

    constructor(settings, key, label, sublabel) {
        super({
            title: label,
            subtitle: sublabel,
            activatable: true
        });

        this.shortcutBox = new Gtk.Box({
            orientation: Gtk.Orientation.HORIZONTAL,
            halign: Gtk.Align.CENTER,
            spacing: 5,
            hexpand: false,
            vexpand: false
        });

        this._key = key;
        this._settings = settings;
        this._description = sublabel;

        this.shortLabel = new Gtk.ShortcutLabel({
            disabled_text: _('New accelerator…'),
            valign: Gtk.Align.CENTER,
            hexpand: false,
            vexpand: false
        });

        this.shortcutBox.append(this.shortLabel);

        // Bind signals
        this.connect('activated', this._onActivated.bind(this));
        this.bind_property('shortcut', this.shortLabel, 'accelerator', GObject.BindingFlags.DEFAULT);
        [this.shortcut] = this._settings.get_strv(this._key);

        this.add_suffix(this.shortcutBox);
    }

    isAcceleratorSet() {
        if (this.shortLabel.get_accelerator()) {
            return true;
        } else {
            return false;
        }
    }

    resetAccelerator() {
        this.saveShortcut(); // Clear shortcut
    }

    _onActivated(widget) {
        let ctl = new Gtk.EventControllerKey();

        let content = new Adw.StatusPage({
            title: _('New accelerator…'),
            description: this._description,
            icon_name: 'preferences-desktop-keyboard-shortcuts-symbolic'
        });

        this._editor = new Adw.Window({
            modal: true,
            hide_on_close: true,
            transient_for: widget.get_root(),
            width_request: 480,
            height_request: 320,
            content
        });

        this._editor.add_controller(ctl);
        ctl.connect('key-pressed', this._onKeyPressed.bind(this));
        this._editor.present();
    }

    _onKeyPressed(_widget, keyval, keycode, state) {
        let mask = state & Gtk.accelerator_get_default_mod_mask();
        mask &= ~Gdk.ModifierType.LOCK_MASK;
            
        if (!mask && keyval === Gdk.KEY_Escape) {
            this._editor.close();
            return Gdk.EVENT_STOP;
        }
        
        if (keyval === Gdk.KEY_BackSpace) {
            this.saveShortcut(); // Clear shortcut
            return Gdk.EVENT_STOP;
        }

        if (!this.isValidBinding(mask, keycode, keyval) || !this.isValidAccel(mask, keyval)) {
            return Gdk.EVENT_STOP;
        }

        this.saveShortcut(keyval, keycode, mask);
        return Gdk.EVENT_STOP;
    }

    saveShortcut(keyval, keycode, mask) {
        if (!keyval && !keycode) {
            this.shortcut = '';
        } else {
            this.shortcut = Gtk.accelerator_name_with_keycode(null, keyval, keycode, mask);
        }

        this.emit('changed', this.shortcut);
        this._settings.set_strv(this._key, [this.shortcut]);
        this._editor.destroy();
    }

    // Functions from https://gitlab.gnome.org/GNOME/gnome-control-center/-/blob/main/panels/keyboard/keyboard-shortcuts.c

    keyvalIsForbidden(keyval) {
        return [
            // Navigation keys
            Gdk.KEY_Home,
            Gdk.KEY_Left,
            Gdk.KEY_Up,
            Gdk.KEY_Right,
            Gdk.KEY_Down,
            Gdk.KEY_Page_Up,
            Gdk.KEY_Page_Down,
            Gdk.KEY_End,
            Gdk.KEY_Tab,

            // Return
            Gdk.KEY_KP_Enter,
            Gdk.KEY_Return,

            Gdk.KEY_Mode_switch
        ].includes(keyval);
    }

    isValidBinding(mask, keycode, keyval) {
        return !(mask === 0 || mask === Gdk.ModifierType.SHIFT_MASK && keycode !== 0 &&
                 ((keyval >= Gdk.KEY_a && keyval <= Gdk.KEY_z) ||
                     (keyval >= Gdk.KEY_A && keyval <= Gdk.KEY_Z) ||
                     (keyval >= Gdk.KEY_0 && keyval <= Gdk.KEY_9) ||
                     (keyval >= Gdk.KEY_kana_fullstop && keyval <= Gdk.KEY_semivoicedsound) ||
                     (keyval >= Gdk.KEY_Arabic_comma && keyval <= Gdk.KEY_Arabic_sukun) ||
                     (keyval >= Gdk.KEY_Serbian_dje && keyval <= Gdk.KEY_Cyrillic_HARDSIGN) ||
                     (keyval >= Gdk.KEY_Greek_ALPHAaccent && keyval <= Gdk.KEY_Greek_omega) ||
                     (keyval >= Gdk.KEY_hebrew_doublelowline && keyval <= Gdk.KEY_hebrew_taf) ||
                     (keyval >= Gdk.KEY_Thai_kokai && keyval <= Gdk.KEY_Thai_lekkao) ||
                     (keyval >= Gdk.KEY_Hangul_Kiyeog && keyval <= Gdk.KEY_Hangul_J_YeorinHieuh) ||
                     (keyval === Gdk.KEY_space && mask === 0) || this.keyvalIsForbidden(keyval))
        );
    }

    isValidAccel(mask, keyval) {
        return Gtk.accelerator_valid(keyval, mask) || (keyval === Gdk.KEY_Tab && mask !== 0);
    }
};
