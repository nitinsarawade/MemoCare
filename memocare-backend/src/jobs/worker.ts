import './speechAnalysis.worker';
import './reminders.worker';
import { logger } from '../config/logger';

logger.info('MemoCare background worker started (speech-analysis + reminders queues)');
