/**
 * Blocks for APA102 (a.k.a. DotStar / SK9822) LED strips.
 *
 * The strip has two signal wires:
 *   DATA  (DI / SDI)  -> micro:bit pin (default P15, SPI MOSI)
 *   CLOCK (CI / CKI)  -> micro:bit pin (default P13, SPI SCK)
 * The data is sent with the micro:bit's hardware SPI.
 */

enum ApaColors {
    //% block=red
    Red = 0xFF0000,
    //% block=orange
    Orange = 0xFF8000,
    //% block=yellow
    Yellow = 0xFFFF00,
    //% block=green
    Green = 0x00FF00,
    //% block=blue
    Blue = 0x0000FF,
    //% block=indigo
    Indigo = 0x4B0082,
    //% block=violet
    Violet = 0x8A2BE2,
    //% block=purple
    Purple = 0xFF00FF,
    //% block=white
    White = 0xFFFFFF,
    //% block=black
    Black = 0x000000
}

/**
 * APA102 LED strip.
 */
//% weight=5 color=#e6007e icon="" block="APA102"
//% groups=['Create', 'Set', 'Show', 'Color', 'Advanced']
namespace apa102 {

    // SPI pins currently configured (-1 = not configured yet)
    let spiData: number = -1;
    let spiClock: number = -1;

    /**
     * A strip of APA102 LEDs.
     */
    export class Strip {
        buf: Buffer;      // whole SPI frame: start frame + LED frames + end frame
        rx: Buffer;       // dummy receive buffer for spiTransfer
        dataPin: DigitalPin;
        clockPin: DigitalPin;
        total: number;    // LEDs in the whole strip
        start: number;    // first LED of this (range of the) strip
        _length: number;  // number of LEDs in this (range of the) strip
        _brightness: number; // 0..31 (hardware global brightness)
        simStrip: neopixel.Strip; // simulator only

        /**
         * Send the colors to the LEDs.
         */
        //% blockId="apa102_show" block="%strip|show"
        //% weight=90 blockGap=8 group="Show"
        show() {
            // In the MakeCode simulator, draw the strip via the NeoPixel simulator part
            if (control.deviceDalVersion() == "sim") {
                this.simShow();
                return;
            }
            // Configure SPI only once (or when the pins change): every pins.spiPins call
            // claims an SPI peripheral, and calling it repeatedly causes panic 090.
            if (spiData != this.dataPin || spiClock != this.clockPin) {
                // pick a MISO pin that does not clash with data or clock
                let miso = DigitalPin.P14;
                if (this.dataPin == miso || this.clockPin == miso) miso = DigitalPin.P16;
                pins.spiPins(this.dataPin, miso, this.clockPin);
                pins.spiFormat(8, 0);
                pins.spiFrequency(4000000);
                spiData = this.dataPin;
                spiClock = this.clockPin;
            }
            pins.spiTransfer(this.buf, this.rx);
        }

        /**
         * Turn all LEDs off (call show to see the change).
         */
        //% blockId="apa102_clear" block="%strip|clear"
        //% weight=85 blockGap=8 group="Set"
        clear() {
            for (let i = 0; i < this._length; i++) {
                this.setRaw(i, 0, 0, 0);
            }
        }

        /**
         * Set all LEDs to one color (call show to see the change).
         * @param rgb the color, eg: ApaColors.Red
         */
        //% blockId="apa102_set_strip_color" block="%strip|set all pixels to %rgb=apa102_colors"
        //% weight=80 blockGap=8 group="Set"
        setStripColor(rgb: number) {
            const r = (rgb >> 16) & 0xFF;
            const g = (rgb >> 8) & 0xFF;
            const b = rgb & 0xFF;
            for (let i = 0; i < this._length; i++) {
                this.setRaw(i, r, g, b);
            }
        }

        /**
         * Set all LEDs to one color and show it immediately.
         * @param rgb the color, eg: ApaColors.Red
         */
        //% blockId="apa102_show_color" block="%strip|show color %rgb=apa102_colors"
        //% weight=89 blockGap=8 group="Show"
        showColor(rgb: number) {
            this.setStripColor(rgb);
            this.show();
        }

        /**
         * Set one LED to a color (call show to see the change).
         * @param pixeloffset position of the LED, eg: 0
         * @param rgb the color, eg: ApaColors.Red
         */
        //% blockId="apa102_set_pixel_color" block="%strip|set pixel color at %pixeloffset|to %rgb=apa102_colors"
        //% weight=79 blockGap=8 group="Set"
        setPixelColor(pixeloffset: number, rgb: number) {
            this.setRaw(pixeloffset, (rgb >> 16) & 0xFF, (rgb >> 8) & 0xFF, rgb & 0xFF);
        }

        /**
         * Set one LED using separate red, green and blue values (0-255).
         * @param pixeloffset position of the LED, eg: 0
         * @param red amount of red 0-255, eg: 255
         * @param green amount of green 0-255, eg: 0
         * @param blue amount of blue 0-255, eg: 128
         */
        //% blockId="apa102_set_pixel_rgb" block="%strip|set pixel at %pixeloffset|to red %red green %green blue %blue"
        //% red.min=0 red.max=255 green.min=0 green.max=255 blue.min=0 blue.max=255
        //% weight=78 blockGap=8 group="Set" advanced=true
        setPixelRGB(pixeloffset: number, red: number, green: number, blue: number) {
            this.setRaw(pixeloffset, red, green, blue);
        }

        /**
         * Show a rainbow over the strip (call show to see the change).
         * @param startHue the start hue (0-360), eg: 1
         * @param endHue the end hue (0-360), eg: 360
         */
        //% blockId="apa102_set_rainbow" block="%strip|show rainbow from %startHue|to %endHue"
        //% startHue.min=0 startHue.max=360 endHue.min=0 endHue.max=360
        //% weight=75 blockGap=8 group="Set"
        showRainbow(startHue: number = 1, endHue: number = 360) {
            if (this._length <= 0) return;
            const n = this._length;
            for (let i = 0; i < n; i++) {
                let hue = startHue;
                if (n > 1) hue = startHue + Math.idiv((endHue - startHue) * i, n - 1);
                this.setPixelColor(i, hsv(hue, 100, 100));
            }
            this.show();
        }

        /**
         * Show a bar graph: the first LEDs light up in proportion to the value.
         * @param value current value, eg: 5
         * @param high maximum value, eg: 10
         * @param rgb the color of the bar, eg: ApaColors.Green
         */
        //% blockId="apa102_bar_graph" block="%strip|show bar graph of %value|up to %high|in color %rgb=apa102_colors"
        //% weight=74 blockGap=8 group="Show"
        showBarGraph(value: number, high: number, rgb: number) {
            if (high <= 0) {
                this.clear();
                this.show();
                return;
            }
            let lit = Math.idiv(Math.abs(value) * this._length, high);
            if (lit > this._length) lit = this._length;
            if (lit == 0 && value != 0) lit = 1;
            for (let i = 0; i < this._length; i++) {
                this.setPixelColor(i, i < lit ? rgb : 0);
            }
            this.show();
        }

        /**
         * Set the brightness of the strip. This is the APA102's built-in
         * brightness control (applies after show).
         * @param brightness brightness 0 (off) to 255 (full), eg: 40
         */
        //% blockId="apa102_set_brightness" block="%strip|set brightness %brightness"
        //% brightness.min=0 brightness.max=255
        //% weight=70 blockGap=8 group="Set"
        setBrightness(brightness: number) {
            brightness = Math.max(0, Math.min(255, brightness));
            this._brightness = Math.idiv(brightness * 31 + 127, 255);
            for (let i = 0; i < this._length; i++) {
                this.buf[4 + (this.start + i) * 4] = 0xE0 | this._brightness;
            }
        }

        /**
         * Shift the pixels along the strip; empty pixels turn off.
         * @param offset number of pixels to shift forward, eg: 1
         */
        //% blockId="apa102_shift" block="%strip|shift pixels by %offset"
        //% weight=60 blockGap=8 group="Advanced" advanced=true
        shift(offset: number = 1) {
            this.buf.shift(-offset * 4, 4 + this.start * 4, this._length * 4);
            this.fixBrightness();
        }

        /**
         * Rotate the pixels along the strip (they wrap around).
         * @param offset number of pixels to rotate forward, eg: 1
         */
        //% blockId="apa102_rotate" block="%strip|rotate pixels by %offset"
        //% weight=59 blockGap=8 group="Advanced" advanced=true
        rotate(offset: number = 1) {
            this.buf.rotate(-offset * 4, 4 + this.start * 4, this._length * 4);
        }

        /**
         * Get a part of the strip, to control it on its own.
         * @param start first LED of the range, eg: 0
         * @param length number of LEDs in the range, eg: 4
         */
        //% blockId="apa102_range" block="%strip|range from %start|with %length|leds"
        //% weight=50 blockGap=8 group="Advanced" advanced=true
        //% blockSetVariable=range
        range(start: number, length: number): Strip {
            start = Math.max(0, Math.min(this._length, start));
            length = Math.max(0, Math.min(this._length - start, length));
            const s = new Strip();
            s.buf = this.buf;
            s.rx = this.rx;
            s.dataPin = this.dataPin;
            s.clockPin = this.clockPin;
            s.total = this.total;
            s.start = this.start + start;
            s._length = length;
            s._brightness = this._brightness;
            s.simStrip = this.simStrip;
            return s;
        }

        /**
         * Number of LEDs in this strip.
         */
        //% blockId="apa102_length" block="%strip|length"
        //% weight=40 blockGap=8 group="Advanced" advanced=true
        length(): number {
            return this._length;
        }

        // simulator only: copy the frame buffer into a NeoPixel strip so it is drawn in the simulator
        private simShow() {
            this.simStrip.setBrightness(Math.idiv((this.buf[4] & 0x1F) * 255, 31));
            for (let i = 0; i < this.total; i++) {
                const o = 4 + i * 4;
                this.simStrip.setPixelColor(i, (this.buf[o + 3] << 16) | (this.buf[o + 2] << 8) | this.buf[o + 1]);
            }
            this.simStrip.show();
        }

        private setRaw(i: number, r: number, g: number, b: number) {
            if (i < 0 || i >= this._length) return;
            const o = 4 + (this.start + i) * 4;
            this.buf[o] = 0xE0 | this._brightness;
            this.buf[o + 1] = b & 0xFF; // APA102 order: brightness, blue, green, red
            this.buf[o + 2] = g & 0xFF;
            this.buf[o + 3] = r & 0xFF;
        }

        private fixBrightness() {
            for (let i = 0; i < this._length; i++) {
                this.buf[4 + (this.start + i) * 4] = 0xE0 | this._brightness;
            }
        }
    }

    /**
     * Create a new APA102 strip.
     * @param dataPin pin connected to the strip's data wire (DI), eg: DigitalPin.P15
     * @param clockPin pin connected to the strip's clock wire (CI), eg: DigitalPin.P13
     * @param numLeds number of LEDs on the strip, eg: 30
     */
    //% blockId="apa102_create" block="APA102 strip data %dataPin clock %clockPin with %numLeds leds"
    //% blockSetVariable=strip
    //% dataPin.defl=DigitalPin.P15 clockPin.defl=DigitalPin.P13
    //% numLeds.defl=30 numLeds.min=1
    //% weight=100 group="Create"
    export function create(dataPin: DigitalPin, clockPin: DigitalPin, numLeds: number): Strip {
        const strip = new Strip();
        const n = Math.max(1, numLeds);
        const endBytes = Math.idiv(n, 16) + 1;
        strip.buf = pins.createBuffer(4 + n * 4 + endBytes);
        strip.rx = pins.createBuffer(strip.buf.length);
        // start frame: 4 bytes of 0x00 (already zero)
        // LED frames: global brightness byte + BGR, default dim so it is safe to look at
        strip._brightness = 4;
        for (let i = 0; i < n; i++) {
            strip.buf[4 + i * 4] = 0xE0 | strip._brightness;
        }
        // end frame: 1s so the clock keeps ticking until the last LED is updated
        for (let j = 0; j < endBytes; j++) {
            strip.buf[4 + n * 4 + j] = 0xFF;
        }
        strip.dataPin = dataPin;
        strip.clockPin = clockPin;
        strip.total = n;
        if (control.deviceDalVersion() == "sim") {
            strip.simStrip = neopixel.create(dataPin, n, NeoPixelMode.RGB);
        }
        strip.start = 0;
        strip._length = n;
        return strip;
    }

    /**
     * Pick one of the standard colors.
     */
    //% blockId="apa102_colors" block="%color"
    //% weight=30 blockGap=8 group="Color"
    export function colors(color: ApaColors): number {
        return color;
    }

    /**
     * Mix a color from red, green and blue (each 0-255).
     * @param red amount of red 0-255, eg: 255
     * @param green amount of green 0-255, eg: 100
     * @param blue amount of blue 0-255, eg: 0
     */
    //% blockId="apa102_rgb" block="red %red|green %green|blue %blue"
    //% red.min=0 red.max=255 green.min=0 green.max=255 blue.min=0 blue.max=255
    //% weight=29 blockGap=8 group="Color"
    export function rgb(red: number, green: number, blue: number): number {
        return ((red & 0xFF) << 16) | ((green & 0xFF) << 8) | (blue & 0xFF);
    }

    /**
     * Make a color from hue (0-360), saturation (0-100) and value/brightness (0-100).
     * @param h hue 0-360, eg: 120
     * @param s saturation 0-100, eg: 100
     * @param v brightness 0-100, eg: 100
     */
    //% blockId="apa102_hsv" block="hue %h|saturation %s|value %v"
    //% h.min=0 h.max=360 s.min=0 s.max=100 v.min=0 v.max=100
    //% weight=28 blockGap=8 group="Color"
    export function hsv(h: number, s: number, v: number): number {
        h = ((h % 360) + 360) % 360;
        s = Math.max(0, Math.min(100, s));
        v = Math.max(0, Math.min(100, v));
        const v8 = Math.idiv(v * 255, 100);
        const s8 = Math.idiv(s * 255, 100);
        const region = Math.idiv(h, 60);
        const rem = h % 60;
        const p = Math.idiv(v8 * (255 - s8), 255);
        const q = Math.idiv(v8 * (255 - Math.idiv(s8 * rem, 60)), 255);
        const t = Math.idiv(v8 * (255 - Math.idiv(s8 * (60 - rem), 60)), 255);
        let r = 0;
        let g = 0;
        let b = 0;
        switch (region) {
            case 0: r = v8; g = t; b = p; break;
            case 1: r = q; g = v8; b = p; break;
            case 2: r = p; g = v8; b = t; break;
            case 3: r = p; g = q; b = v8; break;
            case 4: r = t; g = p; b = v8; break;
            default: r = v8; g = p; b = q; break;
        }
        return rgb(r, g, b);
    }
}
