const fs = require('fs')
const YAML = require('yaml')
const core = require('@actions/core')

const cliConfigPath = `${process.env.HOME}/.jira.d/config.yml`
const configPath = `${process.env.HOME}/jira/config.yml`

core.debug('Requiring Action')
const Action = require('./action')

core.debug('Requiring Github Event Path')
// eslint-disable-next-line import/no-dynamic-require
const githubEvent = process.env.GITHUB_EVENT_PATH ? require(process.env.GITHUB_EVENT_PATH) : []
const config = YAML.parse(fs.readFileSync(configPath, 'utf8'))

async function writeKey (result) {
  if (!result) { return }
  core.debug(`Detected issueKey: ${result.issue}`)
  core.debug(`Saving ${result.issue} to ${cliConfigPath}`)
  core.debug(`Saving ${result.issue} to ${configPath}`)

  // Expose created issue's key as an output

  const yamledResult = YAML.stringify(result)
  const extendedConfig = Object.assign({}, config, result)

  fs.writeFileSync(configPath, YAML.stringify(extendedConfig))

  return fs.appendFileSync(cliConfigPath, yamledResult)
}

async function exec () {
  try {
    const result = await new Action({
      githubEvent,
      argv: parseArgs(),
      config,
    }).execute()

    if (result) {
      core.debug(`Result was returned.`)
      if (Array.isArray(result)) {
        core.debug('Result is an array')
        const outputIssues = []

        for (const item of result) {
          await writeKey({ issue: item.key })
          outputIssues.push(item.key)
        }

        core.setOutput('issues', outputIssues.join(','))

        return
      }
      core.debug('Result is not an array')
      core.setOutput('issue', result.issue)

      return await writeKey(result)
    }

    core.debug('No issueKeys found.')
    core.setNeutral()
  } catch (error) {
    core.setFailed(error.toString())
  }
}

function parseArgs () {
  return {
    string: core.getInput('string') || config.string,
    from: core.getInput('from'),
    githubToken: core.getInput('github-token'),
    head_ref: core.getInput('head-ref'),
    base_ref: core.getInput('base-ref'),
    createIssue: core.getInput('create-github-issue') === 'true',
  }
}

exec()
