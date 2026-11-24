# APA102 LED strip for micro:bit

MakeCode extension with blocks for **APA102 / DotStar / SK9822** LED strips.
Unlike NeoPixels, these strips have two signal wires (data + clock) and are driven with the micro:bit's hardware SPI.

## Wiring

| Strip       | micro:bit                          |
|-------------|------------------------------------|
| DI / SDI    | P15 (data, default)                |
| CI / CKI    | P13 (clock, default)               |
| GND         | GND (also connect the strip's PSU ground to the micro:bit GND) |
| 5V          | external 5V supply (not the micro:bit 3V pin for more than a few LEDs) |

The micro:bit outputs 3.3 V logic; most APA102 strips work fine with that, but a 74HCT125 / 74AHCT125 level shifter is recommended for long strips.
Pin P14 is used internally as an (unused) SPI MISO pin, so avoid using it for something else while the strip is in use.

## Usage

```blocks
let strip = apa102.create(DigitalPin.P15, DigitalPin.P13, 30)
strip.setBrightness(40)
strip.showColor(ApaColors.Red)
basic.pause(500)
strip.showRainbow(1, 360)
```

### Blocks

* `APA102 strip data … clock … with … leds` – create a strip
* `show`, `clear`
* `set all pixels to`, `show color`, `set pixel color at … to …`
* `show rainbow from … to …`, `show bar graph of … up to …`
* `set brightness` – 0-255, uses the APA102's built-in 5-bit global brightness
* `shift`, `rotate`, `range`, `length` (under *Advanced*)
* Color blocks: standard colors, `red green blue`, `hue saturation value`

Changes to pixels (`set pixel…`, `clear`, `set all pixels…`) only appear after `show`.

## Use as an extension

In MakeCode (https://makecode.microbit.org): **Extensions** → paste the GitHub URL of this repository → **Import**.

## Supported targets

* for PXT/microbit

```package
apa102=github:YOUR-USERNAME/pxt-apa102
```
