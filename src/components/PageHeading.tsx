import { goBack } from '../hooks/useNavigation';
import Icon from './Icon';
export default function PageHeading({ title, back = false }: { title: string; back?: boolean }) {
  return <div className="page-heading">{back && <button className="icon-button" onClick={goBack} aria-label="이전 화면으로"><Icon name="back" /></button>}<h1>{title}</h1></div>;
}
