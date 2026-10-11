export interface Branch {
  /** 메가박스 지점 코드 */
  brchNo: string;
  /** 알림 메시지에 표시할 지점명 */
  name: string;
}

/*
 * 감시 대상 지점. 지점별 스냅샷 파일명에는 지점 코드(brchNo)가 붙는다.
 * schedulePage.do는 brchNo1~3까지 한 번에 조회 가능하므로 4개 이상이 되면 조회를 청크로 나눠야 한다.
 */
export const WATCH_BRANCHES: readonly Branch[] = [
  { brchNo: '0019', name: '남양주현대아울렛스페이스원' },
  { brchNo: '1351', name: '코엑스' },
  { brchNo: '1212', name: '홍대' },
];
