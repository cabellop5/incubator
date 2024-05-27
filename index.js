const TelegramBot = require('node-telegram-bot-api');
const mqtt = require('mqtt')

const host = process.env.MQTT_HOST
const port = process.env.MQTT_PORT
const clientId = `mqtt_${Math.random().toString(16).slice(3)}`

const TEMPERATURE = process.env.TEMPERATURE
const RELAY_ADDRESS = process.env.RELAY_ADDRESS

const token = process.env.TELEGRAM_TOKEN
const chatId = process.env.TELEGRAM_CHAT_ID
const bot = new TelegramBot(token, {polling: true});

const GLOBAL_DATA = {
    temperature: '',
    battery: '',
    humidity: '',
    date: '',
    state: '',
}

bot.onText(/\/data/, () => {
    bot.sendMessage(
        chatId,
        `**DATA**
**Temperature: ** ${GLOBAL_DATA.temperature.toString()} ºC
**Humidity: ** ${GLOBAL_DATA.humidity.toString()} %
**State: ** ${GLOBAL_DATA.state}
**Battery: ** ${GLOBAL_DATA.battery.toString()} %
**Updated at: ** ${GLOBAL_DATA.date}`,
        {parse_mode: "Markdown"}
    );
});
bot.onText(/^\/commands/, (msg) => {
    bot.getMyCommands().then(function (info) {
    })
})
bot.onText(/^\/setcommand/, (msg) => {
    const opts = [
        {command: 'data', description: 'Check Temperature'},
    ];
    bot.setMyCommands(opts).then(function (info) {
    })
})
bot.sendMessage(chatId, 'Init ....', {});

const connectUrl = `mqtt://${host}:${port}`
const client = mqtt.connect(connectUrl, {
    clientId,
    clean: true,
    connectTimeout: 4000,
    reconnectPeriod: 1000,
})

const topic = 'zigbee2mqtt/#'
client.on('connect', () => {
    console.log('Connected')
    client.subscribe([topic], () => {
        console.log(`Subscribe to topic '${topic}'`)
        sendOrder('ON')
    })
})
client.on('message', (topic, payload) => {
    const values = JSON.parse(payload.toString())
    if (values.temperature !== undefined) {
        if (values.temperature > TEMPERATURE) {
            sendOrder('OFF')
        }
        if (values.temperature < TEMPERATURE) {
            sendOrder('ON')
        }
        GLOBAL_DATA.temperature = values.temperature
        GLOBAL_DATA.battery = values.battery
        GLOBAL_DATA.humidity = values.humidity
        GLOBAL_DATA.date = new Date().toLocaleString('es-ES')
    }
    if (values.state !== undefined) {
        GLOBAL_DATA.state = values.state
    }
})

function sendOrder(order) {
    client.publish(`zigbee2mqtt/${RELAY_ADDRESS}/set`, JSON.stringify({"state": order}), { qos: 0, retain: false }, (error) => {
        if (error) {
            console.error(error)
        }
    })
}