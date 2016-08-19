var CGTD = CGTD || {};

CGTD.Levels = function() {};
CGTD.Levels.prototype = {
	one: function() {
		this.layers = [];

		this.map = this.game.add.tilemap('level1');

		this.map.addTilesetImage('background', 'tiles');
		console.log(this.layers);
		this.layers["bg"] = this.map.createLayer("bg");
		this.layers["fg"] = this.map.createLayer("fg");
		this.layers["collision"] = this.map.createLayer("collision");
		this.layers["fg2"] = this.map.createLayer("fg2");
		this.layers["bg"].resizeWorld();

		this.map.setCollision([47, 48], true, this.layers["collision"], false);

		this.map.setTileIndexCallback(39, function(sprite, tile) {
			this.nextLevel();
		}, this, this.layers["collision"]);
	},
	create: function() {
		this.player = {
			sprite: undefined,
			direction: 0,
			jumpTimer: 0,
			speed: 150,
			jumpSpeed: -300,
			jumpDelay: 500
		};

		this.player.sprite = this.game.add.sprite(50, 50, 'casey');
		this.player.sprite.scale.set(2);
		this.game.physics.enable(this.player.sprite);
		this.player.sprite.body.bounce.y = 0.10;
		this.player.sprite.body.linearDamping = 1;
		this.player.sprite.body.collideWorldBounds = true;
		this.player.sprite.animations.add('walk-r', [2,3,4], 8, true);
		this.player.sprite.animations.add('walk-l', [5,6,7], 8, true);
		this.player.sprite.animations.add('idle', [0,1], 2, true);
		this.player.sprite.body.fixedRotation = true;
		this.player.sprite.smoothed = false;
		this.player.sprite.animations.play("idle");

		this.game.camera.follow(this.player.sprite);

		this.game.physics.arcade.gravity.y = 700;

		this.cursors = this.game.input.keyboard.createCursorKeys();
		this.jumpKey = this.game.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR);
		CGTD.game.state.start("levelmaster");

		this.one();
	},
	update: function() {
		this.game.physics.arcade.collide(this.player.sprite, this.layers["collision"]);

		this.player.sprite.body.velocity.x = 0;
		if (this.cursors.left.isDown) {
			this.player.sprite.body.velocity.x = -this.player.speed;
			if (this.player.direction != -1) {
				this.player.sprite.animations.play("walk-l");
				this.player.direction = -1;
			}

		} else if (this.cursors.right.isDown) {
			this.player.sprite.body.velocity.x = this.player.speed;
			if (this.player.direction != 1) {
				this.player.sprite.animations.play("walk-r");
				this.player.direction = 1;
			}
		} else {
			if (this.player.direction != 0) {
				this.player.sprite.animations.play("idle");
				this.player.direction = 0;
			}
		}

		if (this.jumpKey.isDown && this.player.sprite.body.onFloor() &&
			this.game.time.now > this.player.jumpTimer) {
	        this.player.sprite.body.velocity.y = this.player.jumpSpeed;
	        this.player.jumpTimer = this.game.time.now + this.player.jumpDelay;
	    }
	}
}
