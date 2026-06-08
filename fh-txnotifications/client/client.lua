local function sendNui(action, payload)
    SendNUIMessage({ action = action, payload = payload })
end

local function sendConfig()
    sendNui('config', {
        position             = Config.Position,
        announcementDuration = Config.AnnouncementDuration,
        soundVolume          = Config.SoundVolume,
        enableSound          = Config.EnableSound
    })
end

AddEventHandler('onClientResourceStart', function(resourceName)
    if resourceName ~= GetCurrentResourceName() then return end
    sendConfig()
end)

RegisterNetEvent('txnotify:announcement')
AddEventHandler('txnotify:announcement', function(data)
    if GetInvokingResource() ~= nil then return end
    if type(data) ~= 'table' then return end
    sendNui('announcement', {
        author  = data.author  or 'txAdmin',
        message = data.message or ''
    })
end)

RegisterNetEvent('txnotify:restart')
AddEventHandler('txnotify:restart', function(data)
    if GetInvokingResource() ~= nil then return end
    if type(data) ~= 'table' then return end
    sendNui('restart', {
        secondsRemaining = data.secondsRemaining or 0,
        message          = data.message or ''
    })
end)

RegisterNetEvent('txnotify:dm')
AddEventHandler('txnotify:dm', function(data)
    if GetInvokingResource() ~= nil then return end
    if type(data) ~= 'table' then return end
    sendNui('dm', {
        author  = data.author  or 'txAdmin',
        message = data.message or ''
    })
end)

RegisterNetEvent('txnotify:warn')
AddEventHandler('txnotify:warn', function(data)
    if GetInvokingResource() ~= nil then return end
    if type(data) ~= 'table' then return end
    sendNui('warn', {
        author    = data.author    or 'txAdmin',
        reason    = data.reason    or '',
        warnCount = data.warnCount or 1
    })
    SetNuiFocus(true, false)
end)

RegisterNUICallback('warnDismissed', function(_, cb)
    SetNuiFocus(false, false)
    cb({})
end)
