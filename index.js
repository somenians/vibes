const { executionAsyncResource } = require('async_hooks');
const Discord = require('discord.js');
const { send } = require('process');
const client = new Discord.Client();
const queue = new Map();
const ytdl = require('ytdl-core');
const { YTSearcher } = require('ytsearcher');
// searcher for searching songs through youtube api
const searcher = new YTSearcher({
    key: "AIzaSyDM4F1Nk-jz5nadGYLzLFqWxewZ8qJ7rag",
    revealed: true
});

// on bot deployment logs string
client.on('ready', () => {
    console.log('Music go brrr');
    client.user.setPresence({
        activity: {
             name: 'music. "<help"' ,
             type: 2
        },
    })
})


client.on("message", message => {

    const prefix = '<';

    const serverQueue = queue.get(message.guild.id);

    // if user message starts with prefix, returns
    if (!message.content.startsWith(prefix) || message.author.bot) return;

    // slices the message, trims, then splits it for yt api
    const args = message.content.slice(prefix.length).split(/ +/);
    const command = args.shift().toLowerCase();


    switch(command) {
        case 'play':
        case 'p':    
            execute(message, serverQueue);
            break;
        case 'stop':
        case 's': 
            stop(message, serverQueue);
            break;
        case 'skip':
        case 'sk':
            skip(message, serverQueue);
            break;
        case 'pause':
            pause(message, serverQueue);
            break;
        case 'resume':
            resume(message, serverQueue);
            break;
        case 'help': 
        case 'h': 
            help(message, serverQueue);
            break;
        case 'squeue':
        case 'sq':
            squeue(message, serverQueue);
            break;
        case 'loop':
        case 'l':
            loop(message, serverQueue);
            break;
    }
    
    // function for checking if user is in vc, then returns a string if not.
    async function execute(message, serverQueue) {
        let vc = message.member.voice.channel;
        if(!vc) {
            return message.channel.send("You are not in a voice chat.");
        
        } else {
            // searches request through ytdl & yt api 
            let result = await searcher.search(args.join(" "), { type: "video" })
            const songInfo = await ytdl.getInfo(result.first.url);

            // song title & url
            let song = {
                title: songInfo.videoDetails.title,
                url: songInfo.videoDetails.video_url
            };

            // if server queue empty, creates queue
            if(!serverQueue) {
                const qConstructor = {
                    textChannel: message.channel,
                    voiceChannel: vc,
                    connection: null,
                    songs: [],
                    volume: 5,
                    playing: true,
                    loop: false,
                };

                queue.set(message.guild.id, qConstructor);
                qConstructor.songs.push(song);

                try{
                    let connection = await vc.join();
                    qConstructor.connection = connection;
                    play(message.guild, qConstructor.songs[0]);
                } catch (err) {
                    console.error(err);
                    queue.delete(message.guild.id);
                    return message.channel.send(`Unable to join the voice channel ;-; ${err}`);
                }
            } else {
                serverQueue.songs.push(song);
                return message.channel.send(`**Adding** \`${song.title}\` **to the queue** ${song.url}`);
            }
        }
    }
    function play(guild, song) {
        const serverQueue = queue.get(guild.id);
        if(!song) {
            serverQueue.voiceChannel.leave();
            queue.delete(guild.id);
            return;
        }
        const dispatcher = serverQueue.connection
            .play(ytdl(song.url))
            .on('finish', () => {
                if (!serverQueue.loop) serverQueue.songs.shift();
                play(guild, serverQueue.songs[0]);
            })
            .on("error", error => console.error(error));
            serverQueue.textChannel.send(`🎵 **Now playing**: \`${serverQueue.songs[0].title}\` ${serverQueue.songs[0].url}`)
        
    }
    
    function stop (message, serverQueue) {
        if(!message.member.voice.channel)
            return message.channel.send("You need to join the voice channel")
        serverQueue.songs = [];
        serverQueue.connection.dispatcher.end();
        serverQueue.textChannel.send(`👋 **Disconnected**`)
    }

    function skip (message, serverQueue) {
        if(!message.member.voice.channel)
            return message.channel.send("You need to join the voice channel");
        if(!serverQueue)
            return message.channel.send("There is nothing to skip");
        serverQueue.connection.dispatcher.end();
    }
    function loop (message, serverQueue) {
        if (!message.member.voice.channel) return message.channel.send("**There is nothing to loop ._.**")
        if (!serverQueue) return message.channel.send("**There is nothing playing ._.**")

        serverQueue.loop = !serverQueue.loop
        
        return message.channel.send(`🔁 ${ serverQueue.loop ? `**Looped**` : `**Unlooped**`}`)
    }
    function pause (message, serverQueue) {
        if (serverQueue && serverQueue.playing) {
            serverQueue.playing = false;
            serverQueue.connection.dispatcher.pause();
            return message.channel.send("⏸ **Music Paused**");
        }
    }

    function resume (message, serverQueue) {
        if (serverQueue && !serverQueue.playing) {
            serverQueue.playing = true;
            serverQueue.connection.dispatcher.resume();
            return message.channel.send('▶ **Music Resumed**');
        }

        if (message.guild.qConstructor.loop) {
            message.guild.qConstructor.loop = false;
            message.channel.send(`**🔁 Loop disabled**`);
        } else {
            message.guild.qConstructor.loop = true;
            message.channel.send(`**🔁 Loop enabled**`);
        }
    }

    

    function squeue (message, serverQueue) {
        if (!serverQueue) return message.channel.send("There is nothing playing in the server.", message.channel);
        
        let q = new Discord.MessageEmbed()
            .setAuthor("Music Queue")
            .addField("Currently Playing", serverQueue.songs[0].title, true)
            .setDescription(serverQueue.songs.map((song) => {
                if(song === serverQueue.songs[0]) return;
                return ` **-** ${song.title}`
            }).join("\n"))
            if(serverQueue.songs.length === 1)q.setDescription(`There are currently no songs in the queue`)
            message.channel.send(q)
    }

    function help (message) {
        message.channel.send(
            `**Commands (<):**\n**<play (<p)** - Plays a song\n**<stop (<s)** - Stops the music\n**<pause** - Pauses the song\n**<resume** - Resumes the song\n**<skip (<sk)** - Skips the song\n**<squeue (<sq)** - Shows the song queue
            `)
    }


})

// gets token from heroku
client.login(process.env.TOKEN)