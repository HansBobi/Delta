class MobileFighter {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.gameState = 'playing'; // 'playing', 'gameOver', 'menu'
        
        this.setupCanvas();
        this.initializeGame();
        this.setupEventListeners();
        this.gameLoop();
    }

    setupCanvas() {
        const updateCanvasSize = () => {
            const container = this.canvas.parentElement;
            const rect = container.getBoundingClientRect();
            this.canvas.width = Math.min(rect.width - 20, 800);
            this.canvas.height = Math.min(this.canvas.width * 0.6, 400);
        };
        
        updateCanvasSize();
        window.addEventListener('resize', updateCanvasSize);
    }

    initializeGame() {
        this.weapons = {
            sword: { name: 'Schwert', emoji: '⚔️', damage: 25, speed: 1.2, range: 40, cooldown: 500 },
            bow: { name: 'Bogen', emoji: '🏹', damage: 15, speed: 0.8, range: 120, cooldown: 800 },
            axe: { name: 'Axt', emoji: '🪓', damage: 40, speed: 0.6, range: 35, cooldown: 1000 },
            dagger: { name: 'Dolch', emoji: '🗡️', damage: 12, speed: 1.8, range: 25, cooldown: 300 }
        };

        this.players = {
            1: {
                x: 80,
                y: this.canvas.height / 2,
                health: 100,
                maxHealth: 100,
                weapon: 'sword',
                lastAttack: 0,
                size: 25,
                color: '#4a90e2',
                direction: 1,
                attacking: false,
                speed: 3
            },
            2: {
                x: this.canvas.width - 80,
                y: this.canvas.height / 2,
                health: 100,
                maxHealth: 100,
                weapon: 'bow',
                lastAttack: 0,
                size: 25,
                color: '#e74c3c',
                direction: -1,
                attacking: false,
                speed: 3
            }
        };

        this.projectiles = [];
        this.particles = [];
        this.keys = {};
        this.updateUI();
    }

    setupEventListeners() {
        // Touch and click controls
        document.querySelectorAll('.control-btn').forEach(btn => {
            const action = btn.dataset.action;
            const player = parseInt(btn.dataset.player);
            
            const handleAction = (e) => {
                e.preventDefault();
                this.handlePlayerAction(player, action);
                btn.classList.add('attacking');
                setTimeout(() => btn.classList.remove('attacking'), 200);
            };

            btn.addEventListener('touchstart', handleAction);
            btn.addEventListener('click', handleAction);
        });

        // Menu controls
        document.getElementById('restartBtn').addEventListener('click', () => {
            this.initializeGame();
            this.gameState = 'playing';
            this.hideMenu();
        });

        document.getElementById('weaponSelectBtn').addEventListener('click', () => {
            this.showWeaponMenu();
        });

        document.getElementById('closeWeaponMenu').addEventListener('click', () => {
            this.hideWeaponMenu();
        });

        // Weapon selection
        document.querySelectorAll('.weapon-option').forEach(option => {
            option.addEventListener('click', () => {
                document.querySelectorAll('.weapon-option').forEach(opt => opt.classList.remove('selected'));
                option.classList.add('selected');
                
                const weapon = option.dataset.weapon;
                const player = option.closest('#weaponMenu').dataset.currentPlayer || '1';
                this.players[player].weapon = weapon;
                this.updateUI();
            });
        });

        // Keyboard controls for desktop testing
        document.addEventListener('keydown', (e) => {
            this.keys[e.key] = true;
        });

        document.addEventListener('keyup', (e) => {
            this.keys[e.key] = false;
        });
    }

    handlePlayerAction(player, action) {
        if (this.gameState !== 'playing') return;

        const p = this.players[player];
        const speed = p.speed;

        switch (action) {
            case 'moveLeft':
                p.x = Math.max(p.size, p.x - speed * 8);
                p.direction = -1;
                break;
            case 'moveRight':
                p.x = Math.min(this.canvas.width - p.size, p.x + speed * 8);
                p.direction = 1;
                break;
            case 'moveUp':
                p.y = Math.max(p.size, p.y - speed * 8);
                break;
            case 'moveDown':
                p.y = Math.min(this.canvas.height - p.size, p.y + speed * 8);
                break;
            case 'attack':
                this.attack(player);
                break;
            case 'switchWeapon':
                this.switchWeapon(player);
                break;
        }
    }

    switchWeapon(player) {
        const weaponKeys = Object.keys(this.weapons);
        const currentIndex = weaponKeys.indexOf(this.players[player].weapon);
        const nextIndex = (currentIndex + 1) % weaponKeys.length;
        this.players[player].weapon = weaponKeys[nextIndex];
        this.updateUI();
    }

    attack(playerId) {
        const player = this.players[playerId];
        const weapon = this.weapons[player.weapon];
        const now = Date.now();

        if (now - player.lastAttack < weapon.cooldown) return;

        player.lastAttack = now;
        player.attacking = true;

        setTimeout(() => {
            player.attacking = false;
        }, 300);

        // Create attack effect
        this.createAttackEffect(player, weapon);

        // Check for hits
        const opponent = this.players[playerId === 1 ? 2 : 1];
        const distance = Math.sqrt(
            Math.pow(player.x - opponent.x, 2) + 
            Math.pow(player.y - opponent.y, 2)
        );

        if (weapon.name === 'Bogen') {
            // Projectile weapon
            this.createProjectile(player, weapon, playerId);
        } else if (distance <= weapon.range + player.size + opponent.size) {
            // Melee weapon
            this.hitPlayer(opponent, weapon.damage);
        }
    }

    createProjectile(player, weapon, playerId) {
        const projectile = {
            x: player.x + player.direction * player.size,
            y: player.y,
            vx: player.direction * 8,
            vy: 0,
            damage: weapon.damage,
            owner: playerId,
            size: 6,
            lifetime: 100
        };
        this.projectiles.push(projectile);
    }

    createAttackEffect(player, weapon) {
        for (let i = 0; i < 8; i++) {
            const angle = (Math.PI * 2 * i) / 8;
            const particle = {
                x: player.x + Math.cos(angle) * weapon.range,
                y: player.y + Math.sin(angle) * weapon.range,
                vx: Math.cos(angle) * 3,
                vy: Math.sin(angle) * 3,
                life: 20,
                maxLife: 20,
                color: weapon.name === 'Bogen' ? '#8e44ad' : '#f39c12'
            };
            this.particles.push(particle);
        }
    }

    hitPlayer(player, damage) {
        player.health = Math.max(0, player.health - damage);
        
        // Create hit effect
        for (let i = 0; i < 6; i++) {
            const angle = Math.random() * Math.PI * 2;
            const particle = {
                x: player.x,
                y: player.y,
                vx: Math.cos(angle) * 5,
                vy: Math.sin(angle) * 5,
                life: 15,
                maxLife: 15,
                color: '#e74c3c'
            };
            this.particles.push(particle);
        }

        this.updateUI();

        if (player.health <= 0) {
            this.endGame();
        }
    }

    updateProjectiles() {
        this.projectiles = this.projectiles.filter(projectile => {
            projectile.x += projectile.vx;
            projectile.y += projectile.vy;
            projectile.lifetime--;

            // Check collision with opponent
            const opponent = this.players[projectile.owner === 1 ? 2 : 1];
            const distance = Math.sqrt(
                Math.pow(projectile.x - opponent.x, 2) + 
                Math.pow(projectile.y - opponent.y, 2)
            );

            if (distance <= projectile.size + opponent.size) {
                this.hitPlayer(opponent, projectile.damage);
                return false; // Remove projectile
            }

            // Remove if out of bounds or lifetime expired
            return projectile.x > 0 && projectile.x < this.canvas.width &&
                   projectile.y > 0 && projectile.y < this.canvas.height &&
                   projectile.lifetime > 0;
        });
    }

    updateParticles() {
        this.particles = this.particles.filter(particle => {
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.vx *= 0.95;
            particle.vy *= 0.95;
            particle.life--;
            return particle.life > 0;
        });
    }

    handleKeyboardInput() {
        if (this.gameState !== 'playing') return;

        // Player 1 controls (WASD + F for attack)
        if (this.keys['a'] || this.keys['A']) this.handlePlayerAction(1, 'moveLeft');
        if (this.keys['d'] || this.keys['D']) this.handlePlayerAction(1, 'moveRight');
        if (this.keys['w'] || this.keys['W']) this.handlePlayerAction(1, 'moveUp');
        if (this.keys['s'] || this.keys['S']) this.handlePlayerAction(1, 'moveDown');
        if (this.keys['f'] || this.keys['F']) this.handlePlayerAction(1, 'attack');

        // Player 2 controls (Arrow keys + Space for attack)
        if (this.keys['ArrowLeft']) this.handlePlayerAction(2, 'moveLeft');
        if (this.keys['ArrowRight']) this.handlePlayerAction(2, 'moveRight');
        if (this.keys['ArrowUp']) this.handlePlayerAction(2, 'moveUp');
        if (this.keys['ArrowDown']) this.handlePlayerAction(2, 'moveDown');
        if (this.keys[' ']) this.handlePlayerAction(2, 'attack');
    }

    render() {
        // Clear canvas
        this.ctx.fillStyle = 'rgba(44, 82, 52, 0.1)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw grid pattern
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        this.ctx.lineWidth = 1;
        for (let x = 0; x < this.canvas.width; x += 30) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }
        for (let y = 0; y < this.canvas.height; y += 30) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }

        // Draw players
        Object.keys(this.players).forEach(id => {
            this.drawPlayer(this.players[id], id);
        });

        // Draw projectiles
        this.projectiles.forEach(projectile => {
            this.ctx.fillStyle = '#9b59b6';
            this.ctx.beginPath();
            this.ctx.arc(projectile.x, projectile.y, projectile.size, 0, Math.PI * 2);
            this.ctx.fill();
        });

        // Draw particles
        this.particles.forEach(particle => {
            const alpha = particle.life / particle.maxLife;
            this.ctx.fillStyle = particle.color + Math.floor(alpha * 255).toString(16).padStart(2, '0');
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, 2, 0, Math.PI * 2);
            this.ctx.fill();
        });
    }

    drawPlayer(player, id) {
        const weapon = this.weapons[player.weapon];
        
        // Draw player shadow
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        this.ctx.beginPath();
        this.ctx.arc(player.x, player.y + 5, player.size, 0, Math.PI * 2);
        this.ctx.fill();

        // Draw player
        this.ctx.fillStyle = player.attacking ? '#f1c40f' : player.color;
        this.ctx.strokeStyle = '#fff';
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.arc(player.x, player.y, player.size, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.stroke();

        // Draw weapon
        this.ctx.save();
        this.ctx.translate(player.x, player.y);
        this.ctx.rotate(player.direction > 0 ? 0 : Math.PI);
        
        this.ctx.font = '20px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(weapon.emoji, weapon.range * 0.7, 5);
        
        if (player.attacking) {
            // Draw attack range
            this.ctx.strokeStyle = 'rgba(255, 255, 0, 0.5)';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.arc(0, 0, weapon.range + player.size, 0, Math.PI * 2);
            this.ctx.stroke();
        }
        
        this.ctx.restore();

        // Draw player label
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`P${id}`, player.x, player.y - player.size - 10);
    }

    updateUI() {
        // Update health bars
        const player1HealthPercent = (this.players[1].health / this.players[1].maxHealth) * 100;
        const player2HealthPercent = (this.players[2].health / this.players[2].maxHealth) * 100;
        
        document.getElementById('player1Health').style.width = player1HealthPercent + '%';
        document.getElementById('player2Health').style.width = player2HealthPercent + '%';

        // Update weapon displays
        const weapon1 = this.weapons[this.players[1].weapon];
        const weapon2 = this.weapons[this.players[2].weapon];
        
        document.getElementById('player1Weapon').textContent = `${weapon1.emoji} ${weapon1.name}`;
        document.getElementById('player2Weapon').textContent = `${weapon2.emoji} ${weapon2.name}`;
    }

    endGame() {
        this.gameState = 'gameOver';
        const winner = this.players[1].health > 0 ? 'Spieler 1' : 'Spieler 2';
        document.getElementById('gameResult').textContent = `🏆 ${winner} gewinnt! 🏆`;
        this.showMenu();
    }

    showMenu() {
        document.getElementById('gameMenu').classList.remove('hidden');
    }

    hideMenu() {
        document.getElementById('gameMenu').classList.add('hidden');
    }

    showWeaponMenu() {
        document.getElementById('weaponMenu').classList.remove('hidden');
    }

    hideWeaponMenu() {
        document.getElementById('weaponMenu').classList.add('hidden');
    }

    gameLoop() {
        this.handleKeyboardInput();
        
        if (this.gameState === 'playing') {
            this.updateProjectiles();
            this.updateParticles();
        }
        
        this.render();
        requestAnimationFrame(() => this.gameLoop());
    }
}

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new MobileFighter();
});

// Prevent default touch behaviors that might interfere with the game
document.addEventListener('touchmove', (e) => {
    e.preventDefault();
}, { passive: false });

document.addEventListener('touchstart', (e) => {
    if (e.target.tagName !== 'BUTTON') {
        e.preventDefault();
    }
}, { passive: false });