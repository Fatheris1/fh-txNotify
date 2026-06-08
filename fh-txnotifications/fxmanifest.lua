fx_version 'cerulean'
game 'gta5'

name        'fh-txnotifications'
description 'txAdmin announcement, restart, warning, dm UI'
author      '.fatheris (fhresources)'
version     '1.0.0'

server_scripts {
    'config.lua',
    'server/server.lua'
}

client_scripts {
    'config.lua',
    'client/client.lua'
}

ui_page 'ui/index.html'

files {
    'ui/index.html',
    'ui/style.css',
    'ui/script.js',
    'ui/notifysound.mp3'
}
