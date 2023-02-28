import { Error } from '@hackbg/oops'
import { Console, bold } from '@hackbg/logs'

export { bold }

export class DockError extends Error {

  static NoDockerode = this.define(
    'NoDockerode',
    ()=>'Dockerode API handle not set'
  )

  static NotDockerode = this.define(
    'NotDockerode',
    ()=>'DockerImage: pass a Dock.DockerEngine instance'
  )

  static NoNameNorDockerfile = this.define(
    'NoNameNorDockerfile',
    ()=>'DockerImage: specify at least one of: name, dockerfile'
  )

  static NoDockerfile = this.define(
    'NoDockerfile',
    ()=>'No dockerfile specified'
  )

  static NoContainer = this.define(
    'NoContainer',
    ()=>'No container'
  )

  static ContainerAlreadyCreated = this.define(
    'ContainerAlreadyCreated',
    ()=>'Container already created'
  )

  static NoName = this.define(
    'NoName',
    (action: string) => `Can't ${action} image with no name`
  )

  static PullFailed = this.define(
    'PullFailed',
    (name: string) => `Pulling ${name} failed.`
  )

  static BuildFailed = this.define(
    'BuildFailed',
    (name: string, dockerfile: string, context: string) => (
      `Building ${name} from ${dockerfile} in ${context} failed.`
    )
  )

}

export class DockConsole extends Console {

  ensuring = () => this.info('Ensuring that the image exists')

  imageExists = () => this.info('Image exists')

  notCachedPulling = () => this.info('Not cached, pulling')

  notFoundBuilding = (msg: string) => this.info(`Not found in registry, building (${msg})`)

  buildingFromDockerfile = (file: string) => this.info(`Using dockerfile`, bold(file))

  creatingContainer = () => this.info(`Creating container`)

  boundPort = (containerPort: any, hostPort: any) => {
    this.info(`Container port ${containerPort} bound to host port ${hostPort}`)
  }

  createdWithWarnings = (id: string, warnings?: any) => {
    this.warn(`Creating container ${id} emitted warnings:`)
    if (warnings) this.info(warnings)
  }

}
