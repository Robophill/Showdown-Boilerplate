var fs = require('fs');
var request = require('request');
var path = require('path');

//Avatar reloading
function loadAvatars() {
	var formatList = ['.png', '.gif', '.bmp', '.jpeg', '.jpg'];
	var avatarList = fs.readdirSync('config/avatars');
	for (var i = 0; i < avatarList.length; i++) {
		var name = path.basename(avatarList[i], path.extname(avatarList[i]));
		if (Config.customavatars[name] || formatList.indexOf(path.extname(avatarList[i])) === -1) continue;
		Config.customavatars[name] = avatarList[i];
	}
}
loadAvatars();

if (Config.watchconfig) {
	fs.watchFile(path.resolve(__dirname, 'config/config.js'), function(curr, prev) {
		if (curr.mtime <= prev.mtime) return;
		try {
			delete require.cache[require.resolve('./config/config.js')];
			global.Config = require('./config/config.js');
			if (global.Users) Users.cacheGroupData();
			console.log('Reloaded config/config.js');
			loadAvatars();
		} catch (e) {}
	});
}

exports.commands = {
	customavatar: 'setavatar',
	setavatar: function(target, room, user, connection, cmd) {
		if (!toId(target)) return this.sendReply('/setavatar [user], URL - Sets a custom avatar.');
		if (!this.can('declare')) return false;
		var targetArray = target.split(',');
		var targetUser = Users.get(toId(targetArray[0]));
		if(!targetUser) return this.sendReply("Can not find user "+targetArray[0]+". /setavatar [user], URL - To set a custom avatar.");
		if (typeof targetUser.avatar === 'string') fs.unlink('config/avatars/' + targetUser.avatar);
		targetArray[1] = targetArray[1].trim();
		var formatList = ['.png', '.jpg', '.gif', '.bmp', '.jpeg'];
		var format = path.extname(targetArray[1]);
		if (formatList.indexOf(format) === -1) return this.sendReply('The format of your avatar is not supported. The allowed formats are ' + formatList.join(', ') + '.');
		if(targetArray[1].charAt(0) === ' ') targetArray[1] = targetArray[1].slice(1);
		if (targetArray[1].indexOf('https://') === 0) targetArray[1] = 'http://' + targetArray[1].substr(8);
		else if (targetArray[1].indexOf('http://') !== 0) targetArray[1] = 'http://' + targetArray[1];

		var self = this;
		request.get(targetArray[1]).on('error', function() {
			return self.sendReply("The avatar you picked doesn\'t exist. Try picking a new avatar.");
		}).on('response', function(response) {
			if (response.statusCode == 404) return self.sendReply("The avatar you picked is unavailable. Try picking a new avatar.");
			targetUser.avatar = targetUser.userid + format;
			Config.customavatars[targetUser.userid] = targetUser.avatar;
			self.sendReply('|html|'+targetUser+'s avatar has been set to<br/><img src = "' + targetArray[1] + '" width = 80 height = 80>');
			response.pipe(fs.createWriteStream('config/avatars/' + targetUser.userid + format));
		});
	},

	removeavatar: function(target, room, user, connection, cmd) {
		if (typeof user.avatar === 'Number') return this.sendReply('You do not own a custom avatar.');
		if (toId(target) !== 'confirm')
			return this.sendReply('WARNING: If you choose to delete your avatar now, it cannot be recovered later. If you\'re sure you want to do this, use \'/removeavatar confirm.\'');
		delete Config.customavatars[user.userid];
		fs.unlink('config/avatars/' + user.avatar);
		user.avatar = 1;
		this.sendReply('Your custom avatar has been successfully removed.');
	}
};