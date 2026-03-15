/**
 * Facade Pattern
 * Category: Structural
 *
 * Definition:
 * The Facade pattern provides a unified interface to a set of interfaces in a
 * subsystem. It defines a higher-level interface that makes the subsystem
 * easier to use.
 *
 * When to use:
 * - When you need a simple interface to a complex subsystem
 * - When there are many dependencies between clients and implementation classes
 * - When you want to layer your subsystems
 * - When you want to decouple clients from subsystem components
 *
 * Key Benefits:
 * - Shields clients from subsystem complexity
 * - Promotes weak coupling between subsystem and clients
 * - Doesn't prevent clients from using subsystem classes directly if needed
 * - Makes libraries easier to use, understand, and test
 *
 * Structure:
 * - Facade: Knows which subsystem classes handle requests; delegates work
 * - Subsystem classes: Implement functionality; handle Facade-assigned work
 * - Client: Uses the Facade instead of subsystem objects directly
 */

// ============================================================================
// SUBSYSTEM CLASSES - Complex components the Facade simplifies
// ============================================================================

/**
 * Amplifier - Audio amplification component.
 */
class Amplifier {
  private volume: number = 0;
  private surround: boolean = false;

  turnOn(): void {
    console.log("  Amplifier: Turning on...");
  }

  turnOff(): void {
    console.log("  Amplifier: Turning off...");
  }

  setVolume(level: number): void {
    this.volume = level;
    console.log(`  Amplifier: Setting volume to ${level}`);
  }

  setSurroundSound(on: boolean): void {
    this.surround = on;
    console.log(`  Amplifier: Surround sound ${on ? "ON" : "OFF"}`);
  }

  getVolume(): number {
    return this.volume;
  }
}

/**
 * DVDPlayer - Plays DVD media.
 */
class DVDPlayer {
  private currentMovie: string = "";
  private playing: boolean = false;

  turnOn(): void {
    console.log("  DVD Player: Powering on...");
  }

  turnOff(): void {
    console.log("  DVD Player: Powering off...");
    this.stop();
  }

  insert(movie: string): void {
    this.currentMovie = movie;
    console.log(`  DVD Player: Inserting "${movie}"...`);
  }

  eject(): void {
    console.log(`  DVD Player: Ejecting "${this.currentMovie}"...`);
    this.currentMovie = "";
  }

  play(): void {
    if (this.currentMovie) {
      this.playing = true;
      console.log(`  DVD Player: Playing "${this.currentMovie}"...`);
    }
  }

  pause(): void {
    this.playing = false;
    console.log("  DVD Player: Paused");
  }

  stop(): void {
    this.playing = false;
    console.log("  DVD Player: Stopped");
  }

  isPlaying(): boolean {
    return this.playing;
  }
}

/**
 * Projector - Video projection component.
 */
class Projector {
  private input: string = "";
  private widescreen: boolean = false;

  turnOn(): void {
    console.log("  Projector: Warming up...");
  }

  turnOff(): void {
    console.log("  Projector: Cooling down and shutting off...");
  }

  setInput(input: string): void {
    this.input = input;
    console.log(`  Projector: Setting input to ${input}`);
  }

  setWidescreenMode(on: boolean): void {
    this.widescreen = on;
    console.log(`  Projector: Widescreen mode ${on ? "ON" : "OFF"}`);
  }

  getInput(): string {
    return this.input;
  }
}

/**
 * TheaterLights - Ambient lighting system.
 */
class TheaterLights {
  private brightness: number = 100;

  turnOn(): void {
    this.brightness = 100;
    console.log("  Lights: Turning on (100%)");
  }

  turnOff(): void {
    this.brightness = 0;
    console.log("  Lights: Turning off");
  }

  dim(level: number): void {
    this.brightness = level;
    console.log(`  Lights: Dimming to ${level}%`);
  }

  getBrightness(): number {
    return this.brightness;
  }
}

/**
 * ProjectorScreen - Projection screen (motorized).
 * (Named ProjectorScreen to avoid conflict with DOM's Screen type)
 */
class ProjectorScreen {
  private down: boolean = false;

  lower(): void {
    this.down = true;
    console.log("  Screen: Lowering...");
  }

  raise(): void {
    this.down = false;
    console.log("  Screen: Raising...");
  }

  isDown(): boolean {
    return this.down;
  }
}

/**
 * PopcornMaker - Popcorn machine for the authentic experience.
 */
class PopcornMaker {
  private on: boolean = false;

  turnOn(): void {
    this.on = true;
    console.log("  Popcorn Maker: Starting...");
  }

  turnOff(): void {
    this.on = false;
    console.log("  Popcorn Maker: Turning off...");
  }

  pop(): void {
    if (this.on) {
      console.log("  Popcorn Maker: Popping corn! Fresh popcorn ready!");
    }
  }

  isOn(): boolean {
    return this.on;
  }
}

// ============================================================================
// FACADE - Simplifies the complex subsystem
// ============================================================================

/**
 * HomeTheaterFacade - The unified interface to all home theater components.
 *
 * Without this facade, clients would need to understand and coordinate
 * all the subsystem components themselves. The facade provides simple
 * methods like watchMovie() that handle all the complexity internally.
 */
class HomeTheaterFacade {
  // References to all subsystem components
  private amp: Amplifier;
  private dvd: DVDPlayer;
  private projector: Projector;
  private lights: TheaterLights;
  private screen: ProjectorScreen;
  private popcorn: PopcornMaker;

  constructor(
    amp: Amplifier,
    dvd: DVDPlayer,
    projector: Projector,
    lights: TheaterLights,
    screen: ProjectorScreen,
    popcorn: PopcornMaker
  ) {
    this.amp = amp;
    this.dvd = dvd;
    this.projector = projector;
    this.lights = lights;
    this.screen = screen;
    this.popcorn = popcorn;
  }

  /**
   * watchMovie - One method to start the entire movie experience.
   *
   * Without the facade, the client would need to call ~10 methods
   * on different objects in the right order. The facade handles all this.
   */
  watchMovie(movie: string): void {
    console.log("\n=== Getting ready to watch a movie... ===\n");

    // The facade coordinates all the components
    this.popcorn.turnOn();
    this.popcorn.pop();

    this.lights.dim(10);

    this.screen.lower();

    this.projector.turnOn();
    this.projector.setInput("DVD");
    this.projector.setWidescreenMode(true);

    this.amp.turnOn();
    this.amp.setSurroundSound(true);
    this.amp.setVolume(7);

    this.dvd.turnOn();
    this.dvd.insert(movie);
    this.dvd.play();

    console.log(`\n=== Enjoy your movie: "${movie}"! ===\n`);
  }

  /**
   * endMovie - Shuts everything down properly.
   */
  endMovie(): void {
    console.log("\n=== Shutting down the home theater... ===\n");

    this.popcorn.turnOff();
    this.lights.turnOn();
    this.screen.raise();
    this.projector.turnOff();
    this.amp.turnOff();
    this.dvd.stop();
    this.dvd.eject();
    this.dvd.turnOff();

    console.log("\n=== Home theater shutdown complete ===\n");
  }

  /**
   * pauseMovie - Simple pause functionality.
   */
  pauseMovie(): void {
    console.log("\n=== Pausing movie... ===\n");
    this.dvd.pause();
    this.lights.dim(50);
  }

  /**
   * resumeMovie - Resume from pause.
   */
  resumeMovie(): void {
    console.log("\n=== Resuming movie... ===\n");
    this.lights.dim(10);
    this.dvd.play();
  }

  /**
   * setVolume - Expose simple volume control.
   */
  setVolume(level: number): void {
    this.amp.setVolume(level);
  }
}

// ============================================================================
// ANOTHER EXAMPLE: COMPUTER STARTUP FACADE
// ============================================================================

/**
 * Computer subsystem components
 */
class CPU {
  freeze(): void {
    console.log("  CPU: Freezing processor...");
  }

  jump(position: number): void {
    console.log(`  CPU: Jumping to address ${position}`);
  }

  execute(): void {
    console.log("  CPU: Executing instructions...");
  }
}

class Memory {
  private data: Map<number, string> = new Map();

  load(position: number, data: string): void {
    this.data.set(position, data);
    console.log(`  Memory: Loading "${data}" at position ${position}`);
  }

  read(position: number): string {
    return this.data.get(position) || "";
  }
}

class HardDrive {
  read(lba: number, size: number): string {
    console.log(`  HardDrive: Reading ${size} bytes from sector ${lba}`);
    return `[Boot data from sector ${lba}]`;
  }
}

class Display {
  turnOn(): void {
    console.log("  Display: Powering on...");
  }

  showBootScreen(): void {
    console.log("  Display: Showing boot logo...");
  }

  showDesktop(): void {
    console.log("  Display: Showing desktop...");
  }
}

/**
 * ComputerFacade - Simplifies computer startup/shutdown.
 */
class ComputerFacade {
  private cpu: CPU;
  private memory: Memory;
  private hardDrive: HardDrive;
  private display: Display;

  private BOOT_ADDRESS = 0x0000;
  private BOOT_SECTOR = 0;
  private SECTOR_SIZE = 512;

  constructor() {
    this.cpu = new CPU();
    this.memory = new Memory();
    this.hardDrive = new HardDrive();
    this.display = new Display();
  }

  /**
   * start - Boot up the computer with one method call.
   */
  start(): void {
    console.log("\n>>> Starting computer... <<<\n");

    this.display.turnOn();
    this.display.showBootScreen();

    this.cpu.freeze();

    const bootData = this.hardDrive.read(this.BOOT_SECTOR, this.SECTOR_SIZE);
    this.memory.load(this.BOOT_ADDRESS, bootData);

    this.cpu.jump(this.BOOT_ADDRESS);
    this.cpu.execute();

    this.display.showDesktop();

    console.log("\n>>> Computer started successfully! <<<\n");
  }

  /**
   * shutdown - Graceful shutdown.
   */
  shutdown(): void {
    console.log("\n>>> Shutting down computer... <<<\n");
    console.log("  Saving state...");
    console.log("  Closing applications...");
    console.log("  Computer is now off.");
    console.log("\n>>> Shutdown complete <<<\n");
  }
}

// ============================================================================
// USAGE DEMONSTRATION
// ============================================================================

console.log("=".repeat(60));
console.log("FACADE PATTERN DEMONSTRATION");
console.log("=".repeat(60));

// --- Home Theater Demo ---
console.log("\n--- Home Theater Facade Demo ---");

// Create all subsystem components
const amp = new Amplifier();
const dvd = new DVDPlayer();
const projector = new Projector();
const lights = new TheaterLights();
const projectorScreen = new ProjectorScreen();
const popcorn = new PopcornMaker();

// Create the facade
const homeTheater = new HomeTheaterFacade(
  amp,
  dvd,
  projector,
  lights,
  projectorScreen,
  popcorn
);

// Simple client code - just one method call!
homeTheater.watchMovie("The Matrix");

// Pause for a snack
homeTheater.pauseMovie();

// Resume
homeTheater.resumeMovie();

// End the movie
homeTheater.endMovie();

// --- Computer Startup Demo ---
console.log("\n--- Computer Facade Demo ---");

const computer = new ComputerFacade();

// Start computer with one call (instead of managing CPU, Memory, etc.)
computer.start();

// Shutdown
computer.shutdown();

// --- Comparison: Without Facade ---
console.log("\n--- Without Facade (Manual Control) ---\n");
console.log("Without a facade, client code would look like this:\n");
console.log(`
  // Client needs to know about ALL components:
  const amp = new Amplifier();
  const dvd = new DVDPlayer();
  const projector = new Projector();
  // ... plus lights, screen, popcorn

  // Client needs to call methods in correct order:
  popcorn.turnOn();
  popcorn.pop();
  lights.dim(10);
  screen.lower();
  projector.turnOn();
  projector.setInput("DVD");
  projector.setWidescreenMode(true);
  amp.turnOn();
  amp.setSurroundSound(true);
  amp.setVolume(7);
  dvd.turnOn();
  dvd.insert("movie");
  dvd.play();

  // That's 13+ method calls the client needs to manage!
  // With facade: just homeTheater.watchMovie("movie")
`);

console.log("=".repeat(60));
console.log("Facade Pattern Demo Complete!");
console.log("=".repeat(60));
