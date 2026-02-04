import { ClientState, ClientStateType, ConnectedClient } from '../types';
import { colorize, colors } from '../utils/colors';
import { writeToClient } from '../utils/socketWriter';

// ASCII art for the welcome screen
const WELCOME_ART = `
${colorize('            ╔═══════════════════════════════════════════════╗', 'cyan')}
${colorize('            ║', 'cyan')}  ${colorize('████████╗██╗  ██╗ ██████╗ ██████╗ ███╗   ██╗', 'green')}  ${colorize('║', 'cyan')}
${colorize('            ║', 'cyan')}  ${colorize('╚══██╔══╝██║  ██║██╔═══██╗██╔══██╗████╗  ██║', 'green')}  ${colorize('║', 'cyan')}
${colorize('            ║', 'cyan')}     ${colorize('██║   ███████║██║   ██║██████╔╝██╔██╗ ██║', 'green')}  ${colorize('║', 'cyan')}
${colorize('            ║', 'cyan')}     ${colorize('██║   ██╔══██║██║   ██║██╔══██╗██║╚██╗██║', 'green')}  ${colorize('║', 'cyan')}
${colorize('            ║', 'cyan')}     ${colorize('██║   ██║  ██║╚██████╔╝██║  ██║██║ ╚████║', 'green')}  ${colorize('║', 'cyan')}
${colorize('            ║', 'cyan')}     ${colorize('╚═╝   ╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═══╝', 'green')}  ${colorize('║', 'cyan')}
${colorize('            ║', 'cyan')}                                               ${colorize('║', 'cyan')}
${colorize('            ║', 'cyan')}  ${colorize('██╗    ██╗ ██████╗  ██████╗ ██████╗ ███████╗', 'yellow')}  ${colorize('║', 'cyan')}
${colorize('            ║', 'cyan')}  ${colorize('██║    ██║██╔═══██╗██╔═══██╗██╔══██╗██╔════╝', 'yellow')}  ${colorize('║', 'cyan')}
${colorize('            ║', 'cyan')}  ${colorize('██║ █╗ ██║██║   ██║██║   ██║██║  ██║███████╗', 'yellow')}  ${colorize('║', 'cyan')}
${colorize('            ║', 'cyan')}  ${colorize('██║███╗██║██║   ██║██║   ██║██║  ██║╚════██║', 'yellow')}  ${colorize('║', 'cyan')}
${colorize('            ║', 'cyan')}  ${colorize('╚███╔███╔╝╚██████╔╝╚██████╔╝██████╔╝███████║', 'yellow')}  ${colorize('║', 'cyan')}
${colorize('            ║', 'cyan')}   ${colorize('╚══╝╚══╝  ╚═════╝  ╚═════╝ ╚═════╝ ╚══════╝', 'yellow')}  ${colorize('║', 'cyan')}
${colorize('            ╚═══════════════════════════════════════════════╝', 'cyan')}
`;

const WELCOME_TEXT = `
${colorize('    ═══════════════════════════════════════════════════════════════', 'bright')}

${colorize('      Welcome, traveler, to the realm of', 'white')} ${colorize('Thornwood Vale', 'green')}${colorize('...', 'white')}

${colorize('      A land of ancient forests, forgotten dungeons, and untold', 'gray')}
${colorize('      adventure awaits those brave enough to explore its depths.', 'gray')}

${colorize('      ▸', 'yellow')} ${colorize('Explore', 'cyan')} ${colorize('mysterious forests and treacherous marshlands', 'white')}
${colorize('      ▸', 'yellow')} ${colorize('Battle', 'red')} ${colorize('fearsome creatures from goblins to dragons', 'white')}
${colorize('      ▸', 'yellow')} ${colorize('Quest', 'magenta')} ${colorize('for glory, treasure, and legendary artifacts', 'white')}
${colorize('      ▸', 'yellow')} ${colorize('Forge', 'green')} ${colorize('your destiny as warrior, mage, thief, or healer', 'white')}

${colorize('    ═══════════════════════════════════════════════════════════════', 'bright')}

`;

export class ConnectingState implements ClientState {
  name = ClientStateType.CONNECTING;

  enter(client: ConnectedClient): void {
    // Clear screen and show welcome
    writeToClient(client, colors.clear);
    writeToClient(client, WELCOME_ART);
    writeToClient(client, WELCOME_TEXT);
  }

  handle(_client: ConnectedClient, _input: string): void {
    // This state automatically transitions to LOGIN in StateMachine
  }

  exit(_client: ConnectedClient): void {
    // No specific cleanup needed for connecting state
  }
}
