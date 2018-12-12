import * as program  from 'commander';

program
  .version('0.1.0')
  .option('--use-polling', 'activate chokidars use-polling')
  .parse(process.argv);



if (program.usePolling) {

}
