local CURRENT_VERSION = '1.0.0'
local VERSION_URL = 'https://raw.githubusercontent.com/fh-txnotifications/txadmin-notifications/main/version.txt'

CreateThread(function()
    if not Config.CheckForUpdates then return end
    Wait(2000)
    PerformHttpRequest(VERSION_URL, function(code, data)
        if code == 200 and data then
            local latest = data:match('^%s*(.-)%s*$')
            if latest and latest ~= CURRENT_VERSION then
                print(string.format('^3[fh-txnotifications] ^1Update available! Current: v%s | Latest: v%s^0', CURRENT_VERSION, latest))
                print('^3[txnotify] ^7Download: https://github.com/fh-txnotifications/txadmin-notifications^0')
            else
                print(string.format('^3[fh-txnotifications] ^2v%s is up to date.^0', CURRENT_VERSION))
            end
        else
            print('^3[fh-txnotifications] ^8Could not check for updates.^0')
        end
    end, 'GET', '', {})
end)

AddEventHandler('txAdmin:events:announcement', function(data)
    if type(data) ~= 'table' then return end
    local author  = tostring(data.author  or 'txAdmin')
    local message = tostring(data.message or '')
    if message == '' then return end
    TriggerClientEvent('txnotify:announcement', -1, { author = author, message = message })
end)

AddEventHandler('txAdmin:events:scheduledRestart', function(data)
    if type(data) ~= 'table' then return end
    local seconds = tonumber(data.secondsRemaining) or 0
    local text    = tostring(data.translatedMessage or '')
    if seconds < 0 then return end
    TriggerClientEvent('txnotify:restart', -1, { secondsRemaining = seconds, message = text })
end)

AddEventHandler('txAdmin:events:playerDirectMessage', function(data)
    if type(data) ~= 'table' then return end
    local target  = tonumber(data.target)
    local author  = tostring(data.author  or 'txAdmin')
    local message = tostring(data.message or '')
    if not target or message == '' then return end
    TriggerClientEvent('txnotify:dm', target, { author = author, message = message })
end)

local WARN_FILE = 'txnotify_warns.json'

local function loadWarnData()
    local raw = LoadResourceFile(GetCurrentResourceName(), WARN_FILE)
    if raw then
        local ok, d = pcall(json.decode, raw)
        if ok and type(d) == 'table' then return d end
    end
    return {}
end

local function saveWarnData(d)
    SaveResourceFile(GetCurrentResourceName(), WARN_FILE, json.encode(d), -1)
end

local warnData = loadWarnData()

AddEventHandler('txAdmin:events:playerWarned', function(data)
    if type(data) ~= 'table' then return end
    local target = tonumber(data.targetNetId)
    local author = tostring(data.author or 'txAdmin')
    local reason = tostring(data.reason or 'No reason provided.')
    if not target then return end

    local license = nil
    if type(data.targetIds) == 'table' then
        for _, id in ipairs(data.targetIds) do
            if string.sub(id, 1, 8) == 'license:' then
                license = id
                break
            end
        end
    end

    if not license then
        local ids = GetPlayerIdentifiers(target)
        if ids then
            for _, id in ipairs(ids) do
                if string.sub(id, 1, 8) == 'license:' then
                    license = id
                    break
                end
            end
        end
    end

    local key = license or ('net:' .. target)
    warnData[key] = (warnData[key] or 0) + 1
    saveWarnData(warnData)

    TriggerClientEvent('txnotify:warn', target, {
        author    = author,
        reason    = reason,
        warnCount = warnData[key]
    })
end)

exports('Announcement', function(author, message)
    if type(message) ~= 'string' or message == '' then return end
    TriggerClientEvent('txnotify:announcement', -1, {
        author  = tostring(author or 'Server'),
        message = message
    })
end)

exports('DirectMessage', function(target, author, message)
    target = tonumber(target)
    if not target or type(message) ~= 'string' or message == '' then return end
    TriggerClientEvent('txnotify:dm', target, {
        author  = tostring(author or 'Server'),
        message = message
    })
end)

exports('Restart', function(secondsRemaining, message)
    secondsRemaining = tonumber(secondsRemaining) or 0
    if secondsRemaining < 0 then return end
    TriggerClientEvent('txnotify:restart', -1, {
        secondsRemaining = secondsRemaining,
        message          = tostring(message or '')
    })
end)
