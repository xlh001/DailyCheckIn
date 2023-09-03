# -*- coding: utf-8 -*-

import threading

from acfun import acfun
from configs import get_env

_print = print
mutex = threading.Lock()


def print(text, *args, **kw):
    """
    使输出有序进行，不出现多线程同一时间输出导致错乱的问题。
    """
    with mutex:
        _print(text, *args, **kw)


def checkin_map() -> list:
    check_function = []
    env = get_env()
    if env.get("Qd_Acfun"):
        check_function.append(acfun)
    return check_function


def Checkin():
    task_list = checkin_map()

    if task_list:
        ts = [threading.Thread(target=mode, name=mode.__name__) for mode in task_list]
        [t.start() for t in ts]
        [t.join() for t in ts]


if __name__ == "__main__":
    # print()
    Checkin()
