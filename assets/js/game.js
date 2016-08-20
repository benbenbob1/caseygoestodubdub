(function() {
	var game = new Phaser.Game(192, 120, Phaser.AUTO, 'canvas', {
			preload: preload,
			create: create,
			update: update
	});
	var cursors, jumpKey, actionKey, pKey;
	var dialogbox;
	var map, layers = [], doors;
	var charGroup, enemyGroup, bulletsGroup, powerupsGroup, heartSprites;
	var characters = [];
	var curLevel;
	var typingDelay = 20;
	var paused = true;
	var audio, curSong;
	var speechCallback;
	var playlist = [
		["assets/soundtrack/margaritaville.mp3", 0.8],
		["assets/soundtrack/underpress.mp3", 0.3],
		["assets/soundtrack/champions.mp3", 0.2],
		["assets/soundtrack/takeonme.mp3", 0.2],
		["assets/soundtrack/hotelcalif.mp3", 0.3],
		["assets/soundtrack/whatislove.mp3", 0.3],
		["assets/soundtrack/giveyouup.mp3", 0.3]
	];
	var speechJSON = false;
	var speechPos = -1;
	//-1 is not started,
	//-2 is ended
	var dialogPos = -1;
	var characterTalking = false;
	var healthBar;

	var hero;

	///////////////// WEAPON /////////////////
	//										//
	//										//
	//										//
	///////////////// WEAPON /////////////////

	var Bullet = function (game, key) {
	    Phaser.Sprite.call(this, game, 8, 8, key);
	    this.texture.baseTexture.scaleMode = PIXI.scaleModes.NEAREST;
	    this.anchor.set(0.5);
	    this.checkWorldBounds = true;
	    this.outOfBoundsKill = true;
	    this.exists = false;
	    this.tracking = false;
	    this.scaleSpeed = 0;
	};

	Bullet.prototype = Object.create(Phaser.Sprite.prototype);
	Bullet.prototype.constructor = Bullet;

	Bullet.prototype.fire = function (x, y, angle, speed, gx, gy) {
	    gx = gx || 0;
	    gy = gy || 0;
	    this.reset(x, y);
	    this.scale.set(2);
	    this.game.physics.arcade.velocityFromAngle(angle, speed,
			this.body.velocity);
	    this.angle = angle;
	    this.body.gravity.set(gx, gy);
	};

	Bullet.prototype.update = function () {
	    if (this.tracking) {
	        this.rotation = Math.atan2(this.body.velocity.y, this.body.velocity.x);
	    }
	    if (this.scaleSpeed > 0) {
	        this.scale.x += this.scaleSpeed;
	        this.scale.y += this.scaleSpeed;
	    }
	};

	var Weapon = {};

	Weapon.PHPGun = function (game) {
	    Phaser.Group.call(this, game, game.world, 'PHP Gun', false, true,
			Phaser.Physics.ARCADE);
	    this.nextFire = 0;
	    this.bulletSpeed = 300;
	    this.fireRate = 500;

	    for (var i = 0; i < 20; i++) {
			var bullet = new Bullet(game, "code");
			bullet.animations.add("animate");
			bullet.animations.play("animate", 10, true);
	        this.add(bullet, true);
	    }

	    return this;
	};
	Weapon.PHPGun.prototype = Object.create(Phaser.Group.prototype);
	Weapon.PHPGun.prototype.constructor = Weapon.PHPGun;
	Weapon.PHPGun.prototype.fire = function (source, angle) {
	    if (this.game.time.time < this.nextFire) { return; }
		if (!this.getFirstExists(false)) { return; }
	    var x = source.x + 10;
	    var y = source.y + 10;
	    this.getFirstExists(false).fire(x, y, angle, this.bulletSpeed, 0, -600);
	    this.nextFire = this.game.time.time + this.fireRate;
	};

	Weapon.SwiftGun = function (game) {
	    Phaser.Group.call(this, game, game.world, 'Swift Gun', false, true,
			Phaser.Physics.ARCADE);
	    this.nextFire = 0;
	    this.bulletSpeed = 600;
	    this.fireRate = 300;

	    for (var i = 0; i < 20; i++) {
			var bullet = new Bullet(game, "swift");
			bullet.animations.add("animate");
			bullet.animations.play("animate", 10, true);
	        this.add(bullet, true);
	    }

	    return this;
	};
	Weapon.SwiftGun.prototype = Object.create(Phaser.Group.prototype);
	Weapon.SwiftGun.prototype.constructor = Weapon.SwiftGun;
	Weapon.SwiftGun.prototype.fire = function (source, angle) {
	    if (this.game.time.time < this.nextFire) { return; }
		if (!this.getFirstExists(false)) { return; }
	    var x = source.x + 10;
	    var y = (source.y + source.height / 2) + this.game.rnd.between(-10, 10);
	    this.getFirstExists(false).fire(x, y, angle, this.bulletSpeed, 0, -650);
	    this.nextFire = this.game.time.time + this.fireRate;
	};

	Enemy = function (game, x, y, key) {
		if (!key) {
			var arr = ["dev1", "dev2"];
			key = arr[Math.floor(Math.random()*arr.length)];
		}
	    Phaser.Sprite.call(this, game, x, y, key);
	    game.physics.enable(this, Phaser.Physics.ARCADE);
	    this.collideWorldBounds = true;
	    this.enableBody = true;
		this.scale.set(2);
		this.animations.add('idle', [0, 1], 2, true);
	    this.animations.add('walk-r', [2, 3, 4], 8, true);
	    this.animations.add('walk-l', [5, 6, 7], 8, true);
		this.animations.add('fire-r', [11, 12, 13, 12], 5, true);
		this.animations.add('fire-l', [8, 9, 10, 9], 5, true);
	    this.body.collideWorldBounds = true;
		this.direction = -1;
		this.smoothed = false;
		this.maxHealth = 2;
		this.health = this.maxHealth;
		this.animations.play('idle');
	};
	Enemy.prototype = Object.create(Phaser.Sprite.prototype);
	Enemy.prototype.constructor = Enemy;

	Enemy.prototype.damage = function (amount) {
		if (!this.alive) {
			return;
		}

		if (this.health - amount <= 0) {
			character_die(this);
		} else {
			this.health -= amount;
		}
	}

	Enemy.prototype.update = function () {
		if (!this.alive || paused) {
			if (paused) {
				this.body.velocity.x = 0;
				this.animations.play('idle');
			}
			return;
		}

		var die = false;
		game.physics.arcade.collide(this, hero.weapon, function(enemy, other) {
			enemy.damage(1);
			other.kill();
			die = true;
	    });
	    if (die) {
	    	return;
	    }

		var collide = false;
		game.physics.arcade.collide(this, layers["collision"],
			function (enemy, tile) {
				//collide = true;
				//enemy.body.velocity.x = 0;
				enemy.body.velocity.y = -200;
		});

		game.physics.arcade.collide(this, enemyGroup, function(enemy, other) {
			enemy.body.velocity.x = 0;
	    });

	    game.physics.arcade.collide(this, charGroup, function(enemy, other) {
			enemy.body.velocity.x = 0;
			damage_hero(1);
	    });

		var xDist = hero.sprite.x - this.x;
		var dist = Phaser.Math.distance(this.x, this.y, hero.sprite.x,
			hero.sprite.y);

		if (dist < 100) {
			if (xDist > 0) {
	            this.animations.play('fire-r');
	        } else {
	            this.animations.play('fire-l');
	        }
		} else if (dist < 250) {
			if (xDist > 0) {
	            this.direction = 1;
	        } else {
	            this.direction = -1;
	        }
			this.body.velocity.x = 100 * this.direction;

			if (!collide) {
				if (this.body.velocity.x > 0) {
					this.animations.play('walk-r');
				} else if (this.body.velocity.x < 0) {
					this.animations.play('walk-l');
				}
			}
		}

		if (this.body.velocity.x == 0 || collide) {
			this.animations.play('idle');
		}
	};

	///////////////// END WEAPON /////////////////
	//											//
	//											//
	//											//
	///////////////// END WEAPON /////////////////


	function preload() {
		game.load.spritesheet("casey", "assets/images/casey.png", 16, 16);
		game.load.spritesheet("klutcher", "assets/images/klutcher.png", 16, 16);
		game.load.spritesheet("dev1", "assets/images/dev1.png", 16, 16);
		game.load.spritesheet("dev2", "assets/images/dev2.png", 16, 16);
		game.load.spritesheet("health", "assets/images/personal.png", 16, 16);
		game.load.spritesheet("explode", "assets/images/esplode.png", 96, 96);
		game.load.spritesheet("code", "assets/images/text.png", 8, 8, 27);
		game.load.spritesheet("swift", "assets/images/swift.png", 8, 8, 30);
		game.load.spritesheet("tshirts", "assets/images/tshirts.png", 16, 16);
		game.load.spritesheet("clarus", "assets/images/clarus.png", 24, 16);
		game.load.tilemap("level1", "assets/map_1-1.json", null,
			Phaser.Tilemap.TILED_JSON);
		game.load.tilemap("level2", "assets/map_1-2.json", null,
			Phaser.Tilemap.TILED_JSON);
		game.load.tilemap("level3", "assets/map_1-3.json", null,
			Phaser.Tilemap.TILED_JSON);
		game.load.tilemap("level4", "assets/map_1-4.json", null,
			Phaser.Tilemap.TILED_JSON);
		game.load.image("tiles", "assets/images/mapitems.png");
		game.physics.startSystem(Phaser.Physics.ARCADE);
		game.stage.backgroundColor = '#d0d0d0';

		(function() {
			var req = new XMLHttpRequest();
			req.open("GET", "assets/speech.json", true);
			req.onreadystatechange = function() {
				if (req.readyState == 4) {
					speechJSON = JSON.parse(req.responseText);
				}
			};
			req.send();
		})();
	}

	function addCharacter(name, x, y, animations, weapon, options) {
		var character = {
			sprite: 	game.add.sprite(x, y, name),
			lastDirection: 	options.lastDirection || 0,
			direction: 	options.direction 	|| 0,
			jumpTimer: 	options.jumpTimer 	|| 0,
			speed: 		options.speed 		|| 150,
			jumpSpeed: 	options.jumpSpeed 	|| -300,
			jumpDelay: 	options.jumpDelay 	|| 500,
			weapon:		weapon				|| null
		};
		characters[name] = character;
		charGroup.add(character.sprite);
		character.sprite.scale.set(options.scale || 2);
		character.sprite.maxHealth = 6;
		character.sprite.setHealth(10);

		if (options.physics !== false) {
			game.physics.enable(character.sprite);
		}

		if (animations && Object.keys(animations).length) {
			for (var a in animations) {
				character.sprite.animations.add(a,
					animations[a][0],
					animations[a][1],
					animations[a][2]
				);
			}
		}

		character.sprite.body.bounce.y = 0.10;
		character.sprite.body.linearDamping = 1;
		character.sprite.body.collideWorldBounds = true;
		character.sprite.body.fixedRotation = true;

		character.sprite.smoothed = false;
		if (animations["idle"]) {
			character.sprite.animations.play("idle");
		}

		return character;
	}

	function create() {
		charGroup = game.add.group();
		heartSprites = game.add.group();

		var lookFor = [38,38,40,40,37,39,37,39,66,65,13];
		var entered = [];
		document.addEventListener("keydown", function(event) {
			entered.push(event.keyCode);
			var i;
			for (i=0; i<entered.length && i<lookFor.length; i++) {
				if (entered[i] !== lookFor[i]) {
					entered = [];
					break;
				}
			}
			if (i==lookFor.length) {
				entered = [];
				play_playlist(playlist.length - 1, true);
			}
		});

		hero = addCharacter("casey", 40, 50, {
			'walk-r': [[2,3,4], 8, true],
			'walk-l': [[5,6,7], 8, true],
			'fire-l': [[8], 8, false],
			'fire-r': [[9], 8, false],
			'idle'  : [[0,1], 2, true]
		}, null, {});

		game.physics.arcade.gravity.y = 700;

		game.camera.follow(hero.sprite);

		cursors = game.input.keyboard.createCursorKeys();
		jumpKey = game.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR);
		actionKey = game.input.keyboard.addKey(Phaser.Keyboard.F);
		pKey = game.input.keyboard.addKey(Phaser.Keyboard.P);

		set_level(1);
	}

	function clear_dialog() {
		dialogbox.innerHTML = "";
	}

	function start_speech(characterName, callback) {
		speechPos = -1;
		speechCallback = callback;
		speech_next(characterName);
	}

	var justsayin = false;
	function just_say(text, style, callback) {
		justsayin = true;
		paused = true;
		dialogPos = 1;
		speechCallback = function() {
			paused = false;
			justsayin = false;
			clear_dialog();
			if (callback) {
				callback();
			}
		}
		type_dialog(text, style, typingDelay, function() {
			dialogPos = -1;
		});
	}

	function speech_next(characterName) {
		var arr = speechJSON[curLevel].characters[characterName];
		if (arr && arr.length) {
			speechPos++;
			if (arr.length > speechPos) {
				dialogPos = 1;
				characterTalking = characterName;
				var text = arr[speechPos].text;
				var style = arr[speechPos].style || null;

				type_dialog(text, style, typingDelay,
					function() {
						//Line is over
						dialogPos = -1;
				});
			} else {
				dialogPos = -1;
				speechPos = -2;
				characterTalking = false;
				clear_dialog();
				if (speechCallback) {
					speechCallback();
					speechCallback = false;
				}
			}
		}
	}

	function type_dialog(text, style, delay, callback) {
		if (!dialogbox) {
			dialogbox = document.getElementById("dialogbox");
		}
		clear_dialog();
		var textFull = "";
		var theStyle = style || "";
		function type_out(text, position) {
			var letter = text.substring(position, ++position);
			textFull += letter;
			dialogbox.innerHTML = "<span style=\""+theStyle+"\">"+textFull+
				"</span>";
			if (position < text.length) {
				window.setTimeout(function() {
					type_out(text, position);
					if (callback && position == text.length - 1) {
						callback();
					}
				}, delay);
			}
		}
		type_out(text, 0);
	}

	var _curLev = -1;
	function set_level(level) {
		if (level == _curLev) {
			return;
		}
		_curLev = level;
		if (Object.keys(layers).length > 0) {
			var toRemove = [];
			for (var l in layers) {
				toRemove.push(layers[l]);
			}
			for (var i=0; i<toRemove.length; i++) {
				toRemove[i].destroy();
			}
		}
		game.camera.x = 0;

		if (enemyGroup) {
			enemyGroup.destroy(true);
		}
		if (bulletsGroup) {
			bulletsGroup.destroy(true);
		}
		if (powerupsGroup) {
			powerupsGroup.destroy(true);
		}

		enemyGroup = game.add.group();
		bulletsGroup = game.add.group();
		powerupsGroup = game.add.group();

		layers = [];
		var shouldBringToTop = false;
		switch (level) {
			case 1:
				start_level_1();
				break;
			case 2:
				start_level_2();
				break;
			case 3:
				start_level_3();
				break;
			case 4:
				start_level_4();
				break;
		}
	}

	function start_level_1() {
		curLevel = "level1";
		play_playlist(0, true);
		map = game.add.tilemap(curLevel);
		map.addTilesetImage("background", "tiles");

		layers["bg"] = map.createLayer("bg");
		layers["fg"] = map.createLayer("fg");
		layers["collision"] = map.createLayer("collision");
		game.world.bringToTop(charGroup);
		layers["bg"].resizeWorld();

		map.setCollision([52, 53, 35, 36, 37, 38], true, layers["collision"],
			false);

		map.setTileIndexCallback(45, function(sprite, tile) {
			set_level(2);
		}, this, layers["collision"]);

		paused = true;

		window.setTimeout(function() {
			addCharacter("klutcher", 145, 120, {
				'idle'  : [[0,1], 2, true]
			}, null, {});
			start_speech("Klutcher", function() {
				paused = false;
				characters["klutcher"].sprite.destroy();
				hero.weapon = new Weapon.PHPGun(game);
			});
		}, 2000);
	}

	function start_level_2() {
		curLevel = "level2";
		hero.sprite.x = -10;

		game.scale.setGameSize(800, 120);
		map = game.add.tilemap(curLevel);
		map.addTilesetImage('background', 'tiles');

		enemyGroup.add(new Enemy(game, 400, 200));
		enemyGroup.add(new Enemy(game, 800, 200));
		enemyGroup.add(new Enemy(game, 1000, 200));
		enemyGroup.add(new Enemy(game, 1620, 200));
		enemyGroup.add(new Enemy(game, 1790, 200));
		enemyGroup.add(new Enemy(game, 1800, 200));
		enemyGroup.add(new Enemy(game, 1900, 200));
		enemyGroup.add(new Enemy(game, 1920, 200));
		enemyGroup.add(new Enemy(game, 1940, 200));
		enemyGroup.add(new Enemy(game, 2300, 200));
		enemyGroup.add(new Enemy(game, 2350, 200));
		enemyGroup.add(new Enemy(game, 2400, 200));
		enemyGroup.add(new Enemy(game, 2800, 200));
		enemyGroup.add(new Enemy(game, 2880, 200));
		enemyGroup.add(new Enemy(game, 3000, 200));
		enemyGroup.add(new Enemy(game, 3050, 200));
		enemyGroup.add(new Enemy(game, 3100, 200));
		enemyGroup.add(new Enemy(game, 3150, 200));
		enemyGroup.add(new Enemy(game, 3200, 200));
		enemyGroup.add(new Enemy(game, 3536, 200));
		spawn_powerup(1600, 45, "tshirts", {
			"idle": [[0, 1, 2, 3, 4, 5], 5, true]
		}, function() {
			just_say("POWER UP! I can now use the power of Swift!", null, function()
			{
				hero.weapon = new Weapon.SwiftGun(game);
			});
		});

		layers["bg"] = map.createLayer("bg");
		layers["fg"] = map.createLayer("fg");
		layers["collision"] = map.createLayer("collision");
		layers["fg2"] = map.createLayer("fg2");
		game.world.bringToTop(charGroup);
		game.world.bringToTop(enemyGroup);
		game.world.bringToTop(powerupsGroup);
		layers["fg3"] = map.createLayer("fg3");
		layers["bg"].resizeWorld();

		map.setCollision([7, 37, 38, 53, 54], true, layers["collision"], false);

		var triggered = false;
		map.setTileIndexCallback(55, function(sprite, tile) {
			if (triggered) {
				return;
			}
			triggered = true;
			paused = true;
			setTimeout(function() {
				start_speech("tshirt", function() {
					paused = false;
				});
			}, 500);
		}, this, layers["collision"]);

		map.setTileIndexCallback(45, function(sprite, tile) {
			if (sprite === hero.sprite) {
				set_level(3);
			}
		}, this, layers["collision"]);

		add_health_bar();

		update_health_bar();

		hero.weapon = new Weapon.PHPGun(game);
	}

	function start_level_3() {
		curLevel = "level3";
		hero.sprite.x = -10;
		game.scale.setGameSize(800, 160);

		map = game.add.tilemap(curLevel);
		map.addTilesetImage('background', 'tiles');

		enemyGroup.add(new Enemy(game, 945, 0));
		enemyGroup.add(new Enemy(game, 1135, 0));
		enemyGroup.add(new Enemy(game, 1196, 0));
		enemyGroup.add(new Enemy(game, 1246, 0));
		enemyGroup.add(new Enemy(game, 1400, 0));
		enemyGroup.add(new Enemy(game, 1950, 0));
		enemyGroup.add(new Enemy(game, 2370, 0));
		enemyGroup.add(new Enemy(game, 2600, 0));
		enemyGroup.add(new Enemy(game, 3050, 0));
		enemyGroup.add(new Enemy(game, 3106, 0));
		enemyGroup.add(new Enemy(game, 3160, 0));
		enemyGroup.add(new Enemy(game, 3245, 0));
		enemyGroup.add(new Enemy(game, 3320, 0));
		enemyGroup.add(new Enemy(game, 3466, 0));

		layers["bg"] = map.createLayer("bg");
		layers["fg"] = map.createLayer("fg");
		layers["collision"] = map.createLayer("collision");
		game.world.bringToTop(charGroup);
		game.world.bringToTop(enemyGroup);
		game.world.bringToTop(powerupsGroup);
		layers["fg2"] = map.createLayer("fg2");
		layers["bg"].resizeWorld();

		paused = true;
		start_speech("wwdc", function() {
			paused = false;
		});

		map.setCollision([33, 34, 39, 40, 53, 54, 55, 61, 69, 99], true,
			layers["collision"], false);

		map.setTileIndexCallback(45, function(sprite, tile) {
			if (sprite === hero.sprite) {
				set_level(4);
			}
		}, this, layers["collision"]);

		add_health_bar();

		update_health_bar();

		hero.weapon = new Weapon.SwiftGun(game);
	}

	function start_level_4() {
		curLevel = "level4";
		hero.sprite.x = 10;
		game.scale.setGameSize(192, 120);

		map = game.add.tilemap(curLevel);
		map.addTilesetImage('background', 'tiles');

		enemyGroup.add(new Enemy(game, 200, 0));

		layers["bg"] = map.createLayer("bg");
		layers["fg"] = map.createLayer("fg");
		layers["collision"] = map.createLayer("collision");
		game.world.bringToTop(charGroup);
		game.world.bringToTop(enemyGroup);
		game.world.bringToTop(powerupsGroup);
		layers["bg"].resizeWorld();

		paused = true;
		start_speech("final", function() {
			paused = false;
		});

		addCharacter("clarus", 400, 120, {
			'idle'  : [[0,1], 2, true]
		}, null, {});

		add_health_bar();

		update_health_bar();

		hero.weapon = new Weapon.SwiftGun(game);
	}

	var _barAdded = false;
	function add_health_bar() {
		game.world.bringToTop(heartSprites);
		if (_barAdded) {
			return;
		}
		var width = 16, margin = 4;
		var heartX = margin, heartY = margin;
		for (var i=0; i<hero.sprite.maxHealth; i+=2) {
			var heart = game.add.sprite(heartX, heartY, "health");
			heart.fixedToCamera = true;
			heartX += width + margin;
			heart.animations.add("beat-full", [0, 1], 2, true);
			heart.animations.add("beat-half", [2, 3], 2, true);
			heart.animations.add("beat-none", [4]);
			heart.animations.play("beat-full");
			heartSprites.add(heart);
		}
		_barAdded = true;
	}

	function update_health_bar() {
		var heartCounter = 0;
		var health = hero.sprite.health;
		var numHearts = (health / hero.sprite.maxHealth) * heartSprites.length;
		var fullNum = Math.floor(numHearts);
		for (var i=0; i<fullNum; i++) {
			heartSprites.children[i].animations.play("beat-full");
		}
		for (var i=fullNum; i<heartSprites.length; i++) {
			heartSprites.children[i].animations.play("beat-none");
		}
		if (numHearts - fullNum === 0.5) {
			heartSprites.children[fullNum].animations.play("beat-half");
		}
	}

	function spawn_powerup(x, y, key, animations, callback) {
		var pUp = game.add.sprite(x, y, key);
		if (animations && Object.keys(animations).length) {
			for (var a in animations) {
				pUp.animations.add(a,
					animations[a][0],
					animations[a][1],
					animations[a][2]
				);
			}
			if (animations["idle"]) {
				pUp.animations.play("idle");
			}
		}
		game.physics.enable(pUp, Phaser.Physics.ARCADE);
	    pUp.body.immovable = true;
		pUp.body.moves = false;
		pUp.callback = callback;
		pUp.anchor.set(0.5);
		powerupsGroup.add(pUp);
	}

	// 1 = half heart
	function damage_hero(amount) {
		if (!hero.healing && !_ded) {
			if (hero.sprite.health <= 1) {
				character_die(hero.sprite);
				return;
			}
			hero.sprite.damage(amount);
			update_health_bar();
			var numBlinks = 6;
			function blink(sprite, num) {
				if (num > numBlinks) {
					sprite.alpha = 1.0;
					hero.healing = false;
					return;
				}
				if (num % 2 == 0) {
					sprite.alpha = 0.2;
				} else {
					sprite.alpha = 0.8;
				}
				setTimeout(function() {
					blink(sprite, num+1);
				}, 500);
			}
			hero.healing = true;
			blink(hero.sprite, 0);
		}
	}

	var _ded = false;
	function character_die(characterSprite) {
		if (characterSprite === hero.sprite) {
			if (!_ded ) {
				_ded = true;
				document.getElementById("canvas").style.opacity = 0;
				setTimeout(function() {
					just_say("You have died.", null, function() {
						hero.sprite.x = 0;
						set_level(_curLev = -1);
						setTimeout(function() {
							hero.sprite.health = hero.sprite.maxHealth;
							update_health_bar();
						}, 500);
						hero.sprite.alpha = 1;
						document.getElementById("canvas").style.opacity = 1;
						_ded = false;
					});
				}, 1000);
			}
		} else {
			characterSprite.kill();
		}

		var boom = game.add.sprite(
			characterSprite.x - characterSprite.width,
			characterSprite.y - characterSprite.height,
			"explode");
		boom.animations.add("run");
		boom.animations.play("run");
		characterSprite.alpha = 0;

		setTimeout(function() {
			boom.kill();
		}, 1000);
	}

	function play_playlist(num, playNext) {
		if (num >= playlist.length - 1) {
			num = num % playlist.length;
		}
		if (audio) {
			audio.pause();
		}
		audio = null;
		audio = new Audio(playlist[num][0]);
		audio.volume = playlist[num][1];
		volume = audio.volume;
		audio.load();
		audio.addEventListener("canplaythrough", function() {
			audio.play();
		});
		if (playNext) {
			audio.addEventListener("ended", function() {
				play_playlist(num + 1, playNext);
			});
		}
		curSong = num;
	}

	function hitPowerup(sprite, powerup) {
		if (sprite === hero.sprite && powerup.callback) {
			powerup.callback();
			powerup.kill();
		}
	}

	var _changeable = true;
	function update() {
		if (_changeable && pKey.isDown) {
			_changeable = false;
			play_playlist(curSong + 1, true);
			setTimeout(function() {
				_changeable = true;
			}, 200);
		}

		if (paused) {
			hero.sprite.animations.play("idle");
			hero.direction = 0;
			hero.sprite.body.velocity.x = 0;
			if (jumpKey.isDown) {
				if (dialogPos < 0) {
					if (justsayin) {
						if (speechCallback) {
							speechCallback();
						}
					} else {
						speech_next(characterTalking);
					}
				}
			}
			return;
		}

		game.physics.arcade.collide(hero.sprite, layers["collision"]);
		game.physics.arcade.collide(hero.sprite, powerupsGroup, hitPowerup);

		hero.sprite.body.velocity.x = 0;

		if (cursors.left.isDown) {
			hero.sprite.body.velocity.x = -hero.speed;
			if (hero.direction != -1) {
				hero.sprite.animations.play("walk-l");
				hero.direction = -1;
				hero.lastDirection = -1;
			}
		} else if (cursors.right.isDown) {
			hero.sprite.body.velocity.x = hero.speed;
			if (hero.direction != 1) {
				hero.sprite.animations.play("walk-r");
				hero.direction = 1;
				hero.lastDirection = 1;
			}
		} else if (actionKey.isDown) {
			hero.firing = true;
			var angle = -1;
			if (hero.lastDirection == -1) {
				hero.direction = -1;
				hero.sprite.animations.play("fire-l");
				angle = 180;
			} else {
				hero.direction = 1;
				hero.sprite.animations.play("fire-r");
				angle = 0;
			}
			hero.weapon.fire(hero.sprite, angle);
		} else {
			if (hero.direction != 0) {
				hero.sprite.animations.play("idle");
				hero.direction = 0;
			}
		}

		if (jumpKey.isDown && hero.sprite.body.onFloor() &&
			game.time.now > hero.jumpTimer) {
			hero.sprite.body.velocity.y = hero.jumpSpeed;
			hero.jumpTimer = game.time.now + hero.jumpDelay;
		}
	}


})();
