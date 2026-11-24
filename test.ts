// Tests: only compiled when this repo is opened as a project, not when used as an extension.
let strip = apa102.create(DigitalPin.P15, DigitalPin.P13, 30)
strip.setBrightness(40)
strip.showColor(ApaColors.Red)
basic.pause(500)
strip.showRainbow(1, 360)
basic.forever(function () {
    strip.rotate(1)
    strip.show()
    basic.pause(50)
})
