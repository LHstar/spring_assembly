/**
 * Spring360 弹簧球插件
 * 通过鼠标拖拽一个球体，模拟弹簧物理效果
 * 
 * 元素结构：
 * - wrapper: 插件主容器
 * - svg: SVG元素，用于绘制弹簧
 * - ball: 可拖拽的球体
 * - baseDiv: 基座元素  
 * 
 * 使用方法：
 * new Spring360({ label: '我的球' });// 创建一个新的弹簧球实例
 * 
 * new Spring360({ container: '#myDiv', label: '弹簧球' }); // 指定容器(要求您在页面中自行创建)和标签文字
 * let sp = new Spring360({
      spring_length: 45,//弹簧长度
      baseWidth: 80,//底座长
      baseHeight: 20,//底座高
      container: document.body,
      img: './b_b48751c55ab8e36bfa3704af42bd15be.jpg'
    });
   sp.baseDiv.textContent = '拖动';
 * new Spring360({ label: '日常的头', img: './dog.svg' });
 *
 * 参数说明：options 对象属性
 * - width: 插件容器宽度
 * - height: 插件容器高度
 * - spring_length: 弹簧长度
 * - baseWidth: 基座宽度
 * - baseHeight: 基座高度
 * - container: 插件挂载的容器 如div，默认为document.body
 * - label: 球体上的文字标签，默认'物体'
 * - img: 球体上的图片路径，默认null（显示文字标签） 
 * - spring_width: 弹簧宽度，默认容器宽度的4%
 * - springHeight: 弹簧高度，默认容器高度-弹簧长度
 * - turns: 弹簧圈数，默认7圈
 * - stiffness: 弹性系数，范围0~1，越大弹性越大，默认0.96
 * - damping: 阻尼系数，范围0~1，越接近1阻尼越小，默认0.966
 * - radius: 弹簧拉扯最大半径，默认300px
 * 
 * - author: 小袖空空（xxkk）
 * - email: 2959855299@qq.com
 * - version: 1.0
 * - date: 2025-10-27
 * - license: MIT 使用请标明出处，有问题请联系作者
 */
class Spring360 {
  constructor(options = {}) {
    // 默认参数
    this.options = Object.assign({
      width: 100,
      height: 180,
      spring_length: 50,//弹簧长度
      baseWidth: 80,//底座长
      baseHeight: 18,//底座高
      container: document.body,
      label: '物体',
      img: null // 新增图片参数，默认为 null
    }, options);
    this.options.spring_length = Math.min(this.options.spring_length, this.options.height / 2 - 30);
    this.turns = this.options.turns??7; // 弹簧圈数
    this.springWidth = this.options.spring_width??this.options.width*0.06;//弹簧宽度
    this.springHeight = Math.abs(this.options.height - this.options.spring_length);//弹簧高度
    this.rest = { x: (this.options.width) / 2, y: this.springHeight }; // 球静止点（ball中下点）
    this.base = { x: this.options.width / 2, y: this.options.height - this.options.baseHeight }; // 基座中上点
    this._createElements();
    this._initStyle();// 初始化样式
    this._initPhysics();
    this._bindEvents();
    this._initContainerDrag();// 初始化容器拖拽
  }
  _initStyle() {
    // 注入CSS
    if (document.getElementById('spring360-style'))
      return;
    const style = document.createElement('style');
    style.id = 'spring360-style';
    style.textContent = `
        .spring360-container { background: none; display: flex; justify-content: center; align-items: center;}
        #spring360-ball {
          width: ${this.options.spring_length * 2}px; height: ${this.options.spring_length * 2}px;
           border-radius: 50%;  
          left: 50%;bottom: ${this.springHeight}px;transform: translate(-50%,-100%);
          position: absolute;  display: flex;
          justify-content: center;    /*box-shadow: 0 8px 24px rgba(6, 5, 5, 0.18);  水平居中 background: #888;*/
          align-items: center;      /* 垂直底部对齐 flex-end center;*/
          cursor: grab; 
          user-select: none; z-index: 10; outline: none;
        }
        #spring360-ball img:active { box-shadow: 0 6px 12px rgba(0, 0, 0, 0.36);}
        #spring360-svg { position: absolute; pointer-events: none;}
        .spring360-base {
          width: ${this.options.baseWidth}px; height: ${this.options.baseHeight}px; background: #bbb;
          border-radius: 9px; position: absolute; left: 50%; bottom: 0px; transform: translateX(-50%); z-index: 2;
          box-shadow: 0 2px 10px rgba(0,0,0,0.08);
        }
      `;
    document.head.appendChild(style);

  }

  _createElements() {
    // 插件容器
    this.wrapper = document.createElement('div');
    this.wrapper.className = 'spring360-container';
    this.wrapper.style.position = 'relative';
    // 确保容器允许子元素超出显示（最关键的一步）
    this.wrapper.style.overflow = 'visible';
    if (!this.options.position || this.options.position === 'fixed-br') {// 固定在右下
      this.wrapper.style.position = 'fixed';
      this.wrapper.style.right = '7%';
      this.wrapper.style.bottom = '3%';
    } else {// 保持原有居中
      this.wrapper.style.position = 'relative';
      this.wrapper.style.margin = '0 auto';
    }
    this.wrapper.style.width = this.options.width + 'px';
    this.wrapper.style.height = this.options.height + 'px';
    // SVG弹簧
    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svg.setAttribute('width', this.options.width);
    this.svg.setAttribute('height', this.options.height);
    this.svg.setAttribute('id', 'spring360-svg');
    this.svg.style.position = 'absolute';
    this.svg.style.left = 0;
    this.svg.style.top = 0;
    this.svg.style.pointerEvents = 'none';
    this.svg.style.overflow = 'visible';  // 允许 SVG 的路径超出其边界被显示（兼容性更好）
    this.svg.setAttribute('overflow', 'visible');
    this.wrapper.appendChild(this.svg);
    // 球
    this.ball = document.createElement('div');
    this.ball.id = 'spring360-ball';
    this.ball.style.left = this.rest.x + 'px';
    this.ball.style.top = this.rest.y + 'px';

    this._addBallEle();
    this.wrapper.appendChild(this.ball);
    // 基座
    this.baseDiv = document.createElement('div');
    this.baseDiv.className = 'spring360-base';
    this.wrapper.appendChild(this.baseDiv);
    // 挂载
    if (typeof this.options.container === 'string') {
      document.querySelector(this.options.container).appendChild(this.wrapper);
    } else {
      this.options.container.appendChild(this.wrapper);
    }
  }

  _addBallEle() {//ball添加子元素
    let elem;
    if (this.options.img) {// 添加图片到球体
      elem = document.createElement('img');// 创建图片元素
      elem.src = this.options.img;
      elem.alt = this.options.label;
      elem.style.position = 'absolute';
      elem.style.left = '50%';
      elem.style.top = '100%'; // 父div的底部
      elem.style.transform = 'translate(-50%, -100%)'; // img的中下点对齐父div锚点
    } else {// 添加文字到球体
      elem = document.createElement('span');
      elem.textContent = this.options.label;
      elem.style.fontWeight = 'bold';
      elem.style.fontSize = '1.1em';
      elem.style.color = '#04709bff';
    }
    elem.style.width = 'auto';
    elem.style.height = 'auto';
    elem.style.maxWidth = this.options.width * 0.8 + 'px';
    elem.style.maxHeight = this.options.height * 0.8 + 'px';
    elem.draggable = false;// 新增防止拖拽、选中
    elem.style.userSelect = 'none';
    elem.style.pointerEvents = 'auto'; // 或者直接不写这一行，因为默认就是auto
    this.ball.appendChild(elem);
  }

  _initPhysics() {
    this.stiffness = this.options.stiffness??0.96;// 弹性系数，越大弹性越大 范围0~1
    this.damping = this.options.damping??0.966;// 0~1，越接近1阻尼越小
    this.radius = this.options.radius??300;// 弹簧拉扯最大半径
    this.dragging = false;
    this.offset = { x: 0, y: 0 };
    this.pos = { ...this.rest };
    this.vx = 0;
    this.vy = 0;
    this.animating = false;
    this.ball.style.left = this.rest.x + 'px';
    this.ball.style.top = this.rest.y + 'px';
    this._drawSpring(this.rest);
  }

  _bindEvents() {
    this.ball.addEventListener('mousedown', this._onMouseDown.bind(this));
    document.addEventListener('mousemove', this._onMouseMove.bind(this));
    document.addEventListener('mouseup', this._onMouseUp.bind(this));

    // 触摸事件支持
    this.ball.addEventListener('touchstart', this._onTouchStart.bind(this), { passive: false });
    document.addEventListener('touchmove', this._onTouchMove.bind(this), { passive: false });
    document.addEventListener('touchend', this._onTouchEnd.bind(this), { passive: false });
  }

  _onMouseDown(e) {
    this.dragging = true;
    this.offset.x = e.clientX - parseFloat(this.ball.style.left);
    this.offset.y = e.clientY - parseFloat(this.ball.style.top);
    this.ball.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';
    this.animating = false;
  }
  _onMouseMove(e) {
    if (!this.dragging) return;
    this._moveBall(e.clientX, e.clientY);
  }
  _onMouseUp(e) {
    if (this.dragging) {
      this.dragging = false;
      this.ball.style.cursor = 'grab';
      document.body.style.userSelect = '';
      this._releaseBall();
    }
  }
  _onTouchStart(e) {
    if (e.touches.length > 1) return;
    e.preventDefault();
    const touch = e.touches[0];
    this.dragging = true;
    this.offset.x = touch.clientX - parseFloat(this.ball.style.left);
    this.offset.y = touch.clientY - parseFloat(this.ball.style.top);
    this.ball.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';
    this.animating = false;
  }
  _onTouchMove(e) {
    if (!this.dragging || e.touches.length > 1) return;
    e.preventDefault();
    const touch = e.touches[0];
    this._moveBall(touch.clientX, touch.clientY);
  }
  _onTouchEnd(e) {
    if (this.dragging) {
      this.dragging = false;
      this.ball.style.cursor = 'grab';
      document.body.style.userSelect = '';
      this._releaseBall();
    }
  }

  _moveBall(clientX, clientY) {
    let nx = clientX - this.offset.x, ny = clientY - this.offset.y;
    let cx = nx + this.options.spring_length / 2, cy = ny + this.options.spring_length / 2;
    let dx = cx - this.base.x, dy = cy - this.base.y;
    let dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > this.radius) {
      dx = dx * this.radius / dist;
      dy = dy * this.radius / dist;
      cx = this.base.x + dx;
      cy = this.base.y + dy;
      nx = cx - this.options.spring_length / 2; ny = cy - this.options.spring_length / 2;
    }
    this.pos = { x: nx, y: ny };
    this.ball.style.left = nx + "px";
    this.ball.style.top = ny + "px";
    this._drawSpring({ x: nx, y: ny });
  }
  _releaseBall() {
    let dx = parseFloat(this.ball.style.left) - this.rest.x;
    let dy = parseFloat(this.ball.style.top) - this.rest.y;
    this.vx = dx * 0.17;
    this.vy = dy * 0.17;
    this.animating = true;
    requestAnimationFrame(this._springBack.bind(this));
  }
  _springBack() {
    if (!this.animating) return;
    let x = parseFloat(this.ball.style.left), y = parseFloat(this.ball.style.top);
    let fx = -this.stiffness * (x - this.rest.x);
    let fy = -this.stiffness * (y - this.rest.y);
    this.vx += fx;
    this.vy += fy;
    this.vx *= this.damping;
    this.vy *= this.damping;
    x += this.vx;
    y += this.vy;
    let cx = x + this.options.spring_length / 2, cy = y + this.options.spring_length / 2;
    let dx = cx - this.base.x, dy = cy - this.base.y;
    let dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > this.radius) {
      dx = dx * this.radius / dist;
      dy = dy * this.radius / dist;
      cx = this.base.x + dx;
      cy = this.base.y + dy;
      x = cx - this.options.spring_length / 2; y = cy - this.options.spring_length / 2;
      this.vx = 0; this.vy = 0;
    }
    this.ball.style.left = x + "px";
    this.ball.style.top = y + "px";
    this._drawSpring({ x, y });
    if (Math.abs(this.vx) < 0.35 && Math.abs(this.vy) < 0.35 && Math.abs(x - this.rest.x) < 0.7 && Math.abs(y - this.rest.y) < 0.7) {
      this.ball.style.left = this.rest.x + "px";
      this.ball.style.top = this.rest.y + "px";
      this._drawSpring(this.rest);
      this.animating = false;
      return;
    }
    requestAnimationFrame(this._springBack.bind(this));
  }

  _drawSpring(p) {//p 球中下
    const bx = this.base.x, by = this.base.y;//基底位置
    const tx = p.x, ty = p.y;//球底部位置

    const amp = this.springWidth;
    let dx = bx - tx, dy = by - ty;
    // let len = Math.sqrt(dx * dx + dy * dy);
    let angle = Math.atan2(dy, dx);
    let points = [];
    for (let i = 0; i <= this.turns * 2; ++i) {
      let t = i / (this.turns * 2);
      let px = tx + dx * t;
      let py = ty + dy * t;
      let perpAngle = angle + Math.PI / 2;
      let offset = (i % 2 == 0 ? -amp : amp);
      px += Math.cos(perpAngle) * offset;
      py += Math.sin(perpAngle) * offset;
      points.push([px, py]);
    }
    let d = `M${tx},${ty}`;
    points.forEach(([x, y]) => d += ` L${x},${y}`);
    d += ` L${bx},${by}`;
    this.svg.innerHTML = `<path d="${d}" stroke="#888" stroke-width="1" fill="none" />`;
  }
  _initContainerDrag() {
    const base = this.baseDiv;
    const wrapper = this.wrapper;
    // 只对fixed/absolute生效
    if (wrapper.style.position !== 'fixed' && wrapper.style.position !== 'absolute') return;

    let dragging = false;
    let startX = 0, startY = 0;
    let originLeft = 0, originTop = 0;

    base.style.cursor = 'move';

    const getLeftTop = () => {
      // 提取 px 值
      let left = wrapper.style.left ? parseFloat(wrapper.style.left) : 0;
      let top = wrapper.style.top ? parseFloat(wrapper.style.top) : 0;
      // 如果没设置，用 getBoundingClientRect 估算
      if (!wrapper.style.left || !wrapper.style.top) {
        const rect = wrapper.getBoundingClientRect();
        left = rect.left;
        top = rect.top;
        // 设置一次，后续可直接用
        wrapper.style.left = left + "px";
        wrapper.style.top = top + "px";
        wrapper.style.right = '';
        wrapper.style.bottom = '';
      }
      return { left, top };
    };

    base.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      dragging = true;
      document.body.style.userSelect = 'none';
      const { left, top } = getLeftTop();
      startX = e.clientX;
      startY = e.clientY;
      originLeft = left;
      originTop = top;
    });

    document.addEventListener('mousemove', (e) => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      wrapper.style.left = (originLeft + dx) + "px";
      wrapper.style.top = (originTop + dy) + "px";
      wrapper.style.right = '';
      wrapper.style.bottom = '';
    });

    document.addEventListener('mouseup', (e) => {
      if (!dragging) return;
      dragging = false;
      document.body.style.userSelect = '';
    });

    // 触摸事件
    base.addEventListener('touchstart', (e) => {
      if (e.touches.length > 1) return;
      dragging = true;
      document.body.style.userSelect = 'none';
      const touch = e.touches[0];
      const { left, top } = getLeftTop();
      startX = touch.clientX;
      startY = touch.clientY;
      originLeft = left;
      originTop = top;
    }, { passive: false });

    document.addEventListener('touchmove', (e) => {
      if (!dragging || e.touches.length > 1) return;
      e.preventDefault();
      const touch = e.touches[0];
      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY;
      wrapper.style.left = (originLeft + dx) + "px";
      wrapper.style.top = (originTop + dy) + "px";
      wrapper.style.right = '';
      wrapper.style.bottom = '';
    }, { passive: false });

    document.addEventListener('touchend', (e) => {
      if (!dragging) return;
      dragging = false;
      document.body.style.userSelect = '';
    }, { passive: false });
  }
}

// 用法示例：
// let sp = new Spring360({
//   spring_length: 45,//弹簧长度
//   baseWidth: 80,//底座长
//   baseHeight: 20,//底座高
//   container: document.body,
//   img: './b_b48751c55ab8e36bfa3704af42bd15be.jpg'
// });
// sp.baseDiv.textContent = '拖动';
// new Spring360({ label: '日常的头', img: './dog.svg' });
// new Spring360();
// 或指定容器，自定义标签文字
// new Spring360({ container: '#myDiv', label: '弹簧球' });
// // new Spring360({container: '#yourDiv', label: '我的球'});