# -*- coding: utf-8 -*-
import os

qd_config = {
    "Qd_Acfun": "",
    "Qd_Baidu": "",
}


def get_env() -> dict:
    """获取环境变量

    Returns:
        dict: 变量字典
    """
    for k in qd_config:
        if os.getenv(k):
            v = os.getenv(k)
            qd_config[k] = v
    return qd_config


def env_spl(env: str) -> dict | None:
    """分割环境变量

    Args:
        env (str): 环境变量值

    Returns:
        dict: 分割后账号密码
    """
    if env != "":
        user_disk = []
        date = env.split("&")
        for i in date:
            a = i.split(":")
            user = {"user": a[0], "pwd": a[1]}
            user_disk.append(user)
        return user_disk
