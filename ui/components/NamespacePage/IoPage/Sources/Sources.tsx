import React, { useCallback, useEffect, useState } from 'react';
import useSWR from 'swr';

import { routes } from '../../../routes';
import { swrKeys } from '../../../swrKeys';
import * as Notifications from '../../../app/contexts/Notifications';
import * as PulsarGrpcClient from '../../../app/contexts/PulsarGrpcClient/PulsarGrpcClient';
import * as pb from '../../../../grpc-web/tools/teal/pulsar/ui/io/v1/io_pb';
import { Code } from '../../../../grpc-web/google/rpc/code_pb';
import SvgIcon from '../../../ui/SvgIcon/SvgIcon';
import arrowDownIcon from '../../../ui/ChildrenTable/arrow-down.svg';
import arrowUpIcon from '../../../ui/ChildrenTable/arrow-up.svg';
import ActionButton from '../../../ui/ActionButton/ActionButton';

import s from './Sources.module.css';
import sc from '../../../InstancePage/Configuration/Configuration.module.css';
import cts from '../../../ui/ChildrenTable/ChildrenTable.module.css';

type SinksProps = {
  tenant: string;
  namespace: string;
}

type SortKey =
  'name' |
  'running' |
  'numInstances' |
  'numRunning' |
  'reads' |
  'writes';

type Sort = { key: SortKey, direction: 'asc' | 'desc' };

type ReceivedSinks = {
  [key: string]: string;
  name: string;
  // running: string;
  // numInstances: string;
  // numRunning: string;
  // reads: string;
  // writes: string;
}

const Sources = (props: SinksProps) => {

  const { ioServiceClient } = PulsarGrpcClient.useContext();
  const { notifyError } = Notifications.useContext();

  const [sort, setSort] = useState<Sort>({ key: 'name', direction: 'asc' });
  const [sinks, setSinks] = useState<ReceivedSinks[] | null>(null)

  const { data: receivedSinks, error: groupsError } = useSWR(
    swrKeys.pulsar.tenants.tenant.namespaces.namespace.io.sources._({ tenant: props.tenant, namespace: props.namespace }),
    async () => {
      const req = new pb.GetSourceRequest();
      req.setTenant(props.tenant);
      req.setNamespace(props.namespace);

      const res = await ioServiceClient.getSinks(req, {});
      if (res === undefined) {
        return [];
      }
      if (res.getStatus()?.getCode() !== Code.OK) {
        notifyError(`Unable to get sinks: ${res.getStatus()?.getMessage()}`);
        return [];
      }

      const receivedSinks: ReceivedSinks[] = res.getSinksList().map((source) => {
        return {
          name: source.getName(),
          // running: sink.getRunning().toString(),
          // numInstances: sink.getNumInstances().toString(),
          // numRunning: sink.getNumRunning().toString(),
          // reads: sink.getReads().toString(),
          // writes: sink.getWrites().toString(),
        }
      });

      setSinks(receivedSinks);

      return receivedSinks;
    }
  );

  if (groupsError) {
    notifyError(`Unable to get resource sinks list. ${groupsError}`);
  }

  // const Th = useCallback((props: { title: React.ReactNode, sortKey?: SortKey, isSticky?: boolean }) => {
  //   const handleColumnHeaderClick = () => {
  //     if (props.sortKey === undefined) {
  //       return;
  //     }
  //     if (sort.key === props.sortKey) {
  //       setSort({ key: props.sortKey, direction: sort.direction === 'asc' ? 'desc' : 'asc' });
  //     } else {
  //       setSort({ key: props.sortKey, direction: 'asc' });
  //     }
  //   }

  //   const style: React.CSSProperties = props.isSticky ? { position: 'sticky', left: 0, zIndex: 10 } : {};

  //   return (
  //     <th className={cts.Th} style={style} onClick={handleColumnHeaderClick}>
  //       <div className={props.sortKey === undefined ? '' : cts.SortableTh}>
  //         {props.title}

  //         {sort.key === props.sortKey && (
  //           <div className={cts.SortableThIcon}>
  //             <SvgIcon svg={sort.direction === 'asc' ? arrowUpIcon : arrowDownIcon} />
  //           </div>
  //         )}
  //       </div>
  //     </th>
  //   );
  // }, [sort.direction, sort.key]);

  // useEffect(() => {
  //   if (sinks) {
  //     if (sort.direction === 'asc') {
  //       setSinks( sinks.sort((a, b) => a[sort.key].localeCompare(b[sort.key], 'en', { numeric: true })) )

  //     } else {
  //       setSinks( sinks.sort((a, b) => b[sort.key].localeCompare(a[sort.key], 'en', { numeric: true })) )
  //     }
  //   }
  // }, [sort.key, sort.direction])

  return (
    <div className={s.Sinks}>
      X_X
      {/* {(!sinks || !sinks?.length) && 
        <div className={s.NoData}>
          No data to show.
        </div>
      } */}

      {/* {sinks && sinks.length && 
        <div className={sc.ConfigurationTable}>
          <table className={sc.Table}>
            <thead>
              <tr className={sc.Row}>
                <Th title="Sink name" sortKey="name" isSticky={true} />
                <Th title="Running" sortKey="running" isSticky={true} />
                <Th title="Num instances" sortKey="numInstances" isSticky={true} />
                <Th title="Num running" sortKey="numRunning" isSticky={true} />
                <Th title="Reads" sortKey="reads" isSticky={true} />
                <Th title="Writes" sortKey="writes" isSticky={true} />
                <th />
              </tr>
            </thead>

            <tbody>
              {sinks && sinks.map((sink) => (
                <tr key={sink.name} className={sc.Row}>
                  <td className={`${sc.Cell} ${sc.DynamicConfigCell}`} data-testid={`sink-name-${sink.name}`}>
                    {sink.name}
                  </td>
                  <td className={`${sc.Cell} ${sc.DynamicConfigCell}`} data-testid={`sink-running-${sink.name}`}>
                    {`${sink.running}/${sink.numInstances}`}
                  </td>
                  <td className={`${sc.Cell} ${sc.DynamicConfigCell}`} data-testid={`sink-num-instances-${sink.name}`}>
                    {sink.numInstances}
                  </td>
                  <td className={`${sc.Cell} ${sc.DynamicConfigCell}`} data-testid={`sink-num-running-${sink.name}`}>
                    {sink.numRunning}
                  </td>
                  <td className={`${sc.Cell} ${sc.DynamicConfigCell}`} data-testid={`sink-reads-${sink.name}`}>
                    {sink.reads}
                  </td>
                  <td className={`${sc.Cell} ${sc.DynamicConfigCell}`} data-testid={`sink-writes-${sink.name}`}>
                    {sink.writes}
                  </td>
                  <td className={`${sc.Cell} ${sc.DynamicConfigCell}`}>
                    <ActionButton
                      action={{ type: 'predefined', action: 'edit' }}
                      linkTo={routes.tenants.tenant.namespaces.namespace.io.sinks.edit._.get({ tenant: props.tenant, namespace: props.namespace, sink: sink.name })}
                      onClick={() => undefined}
                      testId={`sink-edit-button-${sink.name}`}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      } */}
    </div>
  )
}

export default Sources;