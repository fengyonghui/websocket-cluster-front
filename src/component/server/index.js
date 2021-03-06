import React, {Component} from 'react'
import Button from '../button'
import {baseURL} from "../../endpoint";
import '../../App.css';

export default class ServerList extends Component {
    state = {
        containers: [],
        serverInfo: [],
        namingInfo: {},
    }

    // 更新
    updateServerInfo = (ip, userCount) => {
        console.log(`更新 ip 为 ${ip} 的数量到 ${userCount}`)
        const {serverInfo} = this.state
        // 判断是否已经有 IP
        if (!serverInfo.some((element) => {
            const sameIp = element.ip === ip
            if (sameIp) {
                element.userCount = userCount
            }
            return sameIp
        })) {
            serverInfo.push({ip, userCount})
        }
        this.setState({
            serverInfo
        })
    }

    async componentDidMount() {
        // 为了在父组件中调用子组件的方法
        this.props.onRef(this)
        // 获取服务列表
        await this.getContainer()
        // 轮询请求
        this.dataPolling = setInterval(async () => {
            await this.getServerStatus();
        }, 5000);
    }

    componentWillUnmount() {
        clearInterval(this.dataPolling);
    }

    createContainer = async () => {
        const res = await fetch(`${baseURL}/docker/run?imageName=websocket:1.0.0`);
        const messageOrId = await res.text();
        if (res.status === 200) {
            console.log(`OK with id: ${messageOrId}`)
            await this.getContainer();
        } else {
            alert(messageOrId);
        }
    }

    removeContainer = async (containerId) => {
        const res = await fetch(`${baseURL}/docker/rm?containerId=${containerId}`);
        const id = await res.text();
        console.log(`Deleted ${id}`)
        await this.getContainer();
    }

    getContainer = async () => {
        const res = await fetch(`${baseURL}/docker/ps?containerName=websocket-server`)
        const ps = await res.json()
        this.setState({
            containers: ps,
        }, async () => {
            await this.getServerStatus();
        })
    }

    getServerStatus = async () => {
        const res = await fetch(`${baseURL}/discovery/naming`);
        const ipAndStatusJSON = await res.json();
        this.setState({
            namingInfo: ipAndStatusJSON
        }, () => {
            // console.log(this.state.namingInfo)
        })
    }

    render() {
        const {serverInfo} = this.state;
        return (
            <div className='top20'>
                <Button onClick={this.getContainer}>刷新 WebSocket 服务列表</Button>
                <table style={{margin: '0 auto'}}>
                    <thead>
                    <tr>
                        <th>🐳 ContainerID</th>
                        <th>ImageName</th>
                        <th>ContainerName</th>
                        <th>ClusterIP</th>
                        <th>State</th>
                        <th>WebSocketClients</th>
                        <th>Action</th>
                    </tr>
                    </thead>
                    <tbody>
                    {this.state.containers.map((v, i) => {
                        const serverIPAddress = v.NetworkSettings.Networks['compose-network'].IPAddress
                        const isHealthy = this.state.namingInfo[serverIPAddress]
                        return <tr key={i}>
                            <td>{v.Id.slice(0, 12)}</td>
                            <td>{v.Image}</td>
                            <td>{v.Names[0].slice(1)}</td>
                            <td>{serverIPAddress}</td>
                            <td>
                                <div className={v.State === 'running' ?
                                    (isHealthy ? 'up' : 'unhealthy') : 'down'}/>
                            </td>
                            <td>{serverInfo.filter((element) => {
                                return element.ip === serverIPAddress
                            }).map((v) => {
                                return v.userCount
                            })}
                            </td>
                            <td>{<Button onClick={() => this.removeContainer(v.Id)}>下线</Button>}</td>
                        </tr>
                    })}
                    </tbody>
                </table>
                <Button onClick={this.createContainer}>
                    + WebSocket 服务实例
                </Button>
            </div>
        )
    }
}
